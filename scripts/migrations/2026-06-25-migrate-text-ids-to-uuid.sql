-- ============================================================================
-- Migration: Migrate All Primary Keys and Foreign Keys from TEXT to UUID
-- Description: All tables currently use TEXT for primary key columns storing
--              UUID strings. This migration converts them to the native UUID
--              type for storage efficiency (~33% smaller) and built-in
--              validation.
--
-- Strategy:
--   0. Create a text_to_uuid() helper that casts valid UUID strings directly
--      and generates deterministic UUID v5 for non-UUID values (e.g. demo
--      data like "bunny-demo-1-lecture-1") to preserve referential integrity.
--   1. Dynamically discover and drop ALL foreign key constraints referencing
--      the tables being altered (so we can safely change column types).
--   2. Alter every id column from TEXT to UUID using text_to_uuid().
--   3. Alter every FK column (userId, courseId, instructorId, enrollmentId,
--      lectureId, paymentId) from TEXT to UUID using text_to_uuid().
--   4. Re-add all foreign key constraints with ON DELETE CASCADE.
--   5. Set DEFAULT gen_random_uuid() on all id columns.
--
-- Safe to re-run — all operations use IF EXISTS / dynamic discovery.
-- Wrapped in a transaction with a savepoint for rollback on failure.
-- ============================================================================

BEGIN;

-- Create a savepoint so we can roll back the entire migration if anything fails
SAVEPOINT migrate_text_to_uuid;

-- ============================================================================
-- Step 0: Create a helper function that safely converts text to UUID.
--         If the text is already a valid UUID string, it's cast directly.
--         Otherwise, a deterministic UUID v5 is generated from the text
--         using uuid-ossp. This preserves referential integrity even for
--         demo data with non-UUID identifiers like "bunny-demo-1-lecture-1".
-- ============================================================================
CREATE OR REPLACE FUNCTION text_to_uuid(input_text TEXT)
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN input_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN input_text::UUID
        ELSE uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', input_text)
    END;
$$;

-- ============================================================================
-- Step 1: Dynamically drop ALL foreign key constraints on every table we
--         are about to alter. This is done by querying pg_constraint so we
--         don't need to hardcode constraint names.
-- ============================================================================
DO $$
DECLARE
    fk_record RECORD;
    table_list TEXT[] := ARRAY[
        'User', 'UserAuth', 'UserRegistration',
        'Course', 'Lecture',
        'Enrollment', 'Payment',
        'UserProgress', 'Certificate',
        'Review', 'DeviceSession', 'AdminApprovalQueue'
    ];
BEGIN
    FOR fk_record IN
        SELECT
            con.conname AS constraint_name,
            cl.relname AS table_name
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        WHERE con.contype = 'f'
          AND cl.relname = ANY(table_list)
    LOOP
        EXECUTE FORMAT('ALTER TABLE %I DROP CONSTRAINT %I',
                       fk_record.table_name, fk_record.constraint_name);
        RAISE NOTICE 'Dropped FK constraint: %.%', fk_record.table_name, fk_record.constraint_name;
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Alter all PRIMARY KEY id columns from TEXT to UUID
--         Uses information_schema to dynamically find id columns.
-- ============================================================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_name IN (
            'User', 'UserAuth', 'UserRegistration',
            'Course', 'Lecture',
            'Enrollment', 'Payment',
            'UserProgress', 'Certificate',
            'Review', 'DeviceSession', 'AdminApprovalQueue'
        )
          AND column_name = 'id'
          AND data_type = 'text'
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING text_to_uuid(%I)',
            col_record.table_name, col_record.column_name, col_record.column_name
        );
        RAISE NOTICE 'Altered %.id to UUID', col_record.table_name;
    END LOOP;
END $$;

-- ============================================================================
-- Step 3: Alter all FK reference columns from TEXT to UUID
--         Targets known FK column names across all tables.
-- ============================================================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_name IN (
            'User', 'UserAuth', 'UserRegistration',
            'Course', 'Lecture',
            'Enrollment', 'Payment',
            'UserProgress', 'Certificate',
            'Review', 'DeviceSession', 'AdminApprovalQueue'
        )
          AND column_name IN ('userId', 'courseId', 'instructorId',
                              'enrollmentId', 'lectureId', 'paymentId',
                              'reviewedBy', 'approvedBy')
          AND data_type = 'text'
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING text_to_uuid(%I)',
            col_record.table_name, col_record.column_name, col_record.column_name
        );
        RAISE NOTICE 'Altered %.% to UUID', col_record.table_name, col_record.column_name;
    END LOOP;
END $$;

-- ============================================================================
-- Step 3.5: Create placeholder records for orphaned FK references
--           After converting all columns to UUID, some FK values may point
--           to non-existent PKs (e.g. demo data "bunny-demo-1-instructor"
--           that became a deterministic UUID, but no matching User row
--           exists). We create minimal placeholder rows to satisfy FK
--           constraints before re-adding them.
-- ============================================================================

-- 3.5a. Placeholder User records for orphaned userId / instructorId values
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    FOR orphan_id IN
        SELECT DISTINCT e."userId" FROM "Enrollment" e LEFT JOIN "User" u ON u.id = e."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT p."userId" FROM "Payment" p LEFT JOIN "User" u ON u.id = p."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT up."userId" FROM "UserProgress" up LEFT JOIN "User" u ON u.id = up."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT c."userId" FROM "Certificate" c LEFT JOIN "User" u ON u.id = c."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT r."userId" FROM "Review" r LEFT JOIN "User" u ON u.id = r."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT d."userId" FROM "DeviceSession" d LEFT JOIN "User" u ON u.id = d."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT co."instructorId" FROM "Course" co LEFT JOIN "User" u ON u.id = co."instructorId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT ua."userId" FROM "UserAuth" ua LEFT JOIN "User" u ON u.id = ua."userId" WHERE u.id IS NULL
        UNION
        SELECT DISTINCT ur."userId" FROM "UserRegistration" ur LEFT JOIN "User" u ON u.id = ur."userId" WHERE u.id IS NULL
    LOOP
        INSERT INTO "User" (id, username, email, "fullName", role, "isActive", "updatedAt")
        VALUES (orphan_id,
                'user_' || replace(orphan_id::text, '-', '_'),
                orphan_id || '@placeholder.local',
                'Auto-migrated User',
                'user',
                true,
                CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created placeholder User: %', orphan_id;
    END LOOP;
END $$;

-- 3.5b. Placeholder Course records for orphaned courseId values
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    FOR orphan_id IN
        SELECT DISTINCT l."courseId" FROM "Lecture" l LEFT JOIN "Course" c ON c.id = l."courseId" WHERE c.id IS NULL
        UNION
        SELECT DISTINCT e."courseId" FROM "Enrollment" e LEFT JOIN "Course" c ON c.id = e."courseId" WHERE c.id IS NULL
        UNION
        SELECT DISTINCT p."courseId" FROM "Payment" p LEFT JOIN "Course" c ON c.id = p."courseId" WHERE c.id IS NULL
        UNION
        SELECT DISTINCT cert."courseId" FROM "Certificate" cert LEFT JOIN "Course" c ON c.id = cert."courseId" WHERE c.id IS NULL
        UNION
        SELECT DISTINCT r."courseId" FROM "Review" r LEFT JOIN "Course" c ON c.id = r."courseId" WHERE c.id IS NULL
    LOOP
        INSERT INTO "Course" (id, title, description, "coverImage", "instructorId", price, "isPublished", "updatedAt")
        VALUES (orphan_id,
                'Auto-migrated Course',
                'Placeholder course created during UUID migration',
                '',
                COALESCE((SELECT "instructorId" FROM "Course" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                0,
                false,
                CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created placeholder Course: %', orphan_id;
    END LOOP;
END $$;

-- 3.5c. Placeholder Enrollment records for orphaned enrollmentId values
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    FOR orphan_id IN
        SELECT DISTINCT p."enrollmentId" FROM "Payment" p LEFT JOIN "Enrollment" e ON e.id = p."enrollmentId" WHERE e.id IS NULL
        UNION
        SELECT DISTINCT up."enrollmentId" FROM "UserProgress" up LEFT JOIN "Enrollment" e ON e.id = up."enrollmentId" WHERE e.id IS NULL
        UNION
        SELECT DISTINCT cert."enrollmentId" FROM "Certificate" cert LEFT JOIN "Enrollment" e ON e.id = cert."enrollmentId" WHERE e.id IS NULL
    LOOP
        INSERT INTO "Enrollment" (id, "userId", "courseId", status, "updatedAt")
        VALUES (orphan_id,
                COALESCE((SELECT "userId" FROM "Enrollment" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                COALESCE((SELECT "courseId" FROM "Enrollment" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                'active',
                CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created placeholder Enrollment: %', orphan_id;
    END LOOP;
END $$;

-- 3.5d. Placeholder Lecture records for orphaned lectureId values
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    FOR orphan_id IN
        SELECT DISTINCT up."lectureId" FROM "UserProgress" up LEFT JOIN "Lecture" l ON l.id = up."lectureId" WHERE l.id IS NULL
    LOOP
        INSERT INTO "Lecture" (id, "courseId", title, "videoUrl", "cloudinaryPublicId", "orderIndex", "isPublished", "updatedAt")
        VALUES (orphan_id,
                COALESCE((SELECT "courseId" FROM "Lecture" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                'Auto-migrated Lecture',
                '',
                '',
                0,
                false,
                CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created placeholder Lecture: %', orphan_id;
    END LOOP;
END $$;

-- 3.5e. Placeholder Payment records for orphaned paymentId values
DO $$
DECLARE
    orphan_id UUID;
BEGIN
    FOR orphan_id IN
        SELECT DISTINCT aq."paymentId" FROM "AdminApprovalQueue" aq LEFT JOIN "Payment" p ON p.id = aq."paymentId" WHERE p.id IS NULL
    LOOP
        INSERT INTO "Payment" (id, "enrollmentId", "userId", "courseId", amount, "paymentType", status, "updatedAt")
        VALUES (orphan_id,
                COALESCE((SELECT "enrollmentId" FROM "Payment" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                COALESCE((SELECT "userId" FROM "Payment" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                COALESCE((SELECT "courseId" FROM "Payment" LIMIT 1), '00000000-0000-0000-0000-000000000000'),
                0,
                'local',
                'pending',
                CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created placeholder Payment: %', orphan_id;
    END LOOP;
END $$;

-- ============================================================================
-- Step 4: Re-add all foreign key constraints with ON DELETE CASCADE
--         Only adds constraints where both the FK column and the referenced
--         PK column exist and are of UUID type.
-- ============================================================================

-- 4a. UserAuth.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserAuth_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'UserAuth' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "UserAuth"
        ADD CONSTRAINT "UserAuth_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4b. UserRegistration.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserRegistration_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'UserRegistration' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "UserRegistration"
        ADD CONSTRAINT "UserRegistration_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4c. Course.instructorId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Course_instructorId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'instructorId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Course"
        ADD CONSTRAINT "Course_instructorId_fkey"
        FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4d. Lecture.courseId → Course.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Lecture_courseId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Lecture' AND column_name = 'courseId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Lecture"
        ADD CONSTRAINT "Lecture_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4e. Enrollment.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Enrollment' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Enrollment"
        ADD CONSTRAINT "Enrollment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4f. Enrollment.courseId → Course.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_courseId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Enrollment' AND column_name = 'courseId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Enrollment"
        ADD CONSTRAINT "Enrollment_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4g. Payment.enrollmentId → Enrollment.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_enrollmentId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Payment' AND column_name = 'enrollmentId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Enrollment' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT "Payment_enrollmentId_fkey"
        FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4h. Payment.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Payment' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT "Payment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4i. Payment.courseId → Course.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_courseId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Payment' AND column_name = 'courseId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT "Payment_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4j. UserProgress.enrollmentId → Enrollment.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserProgress_enrollmentId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'UserProgress' AND column_name = 'enrollmentId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Enrollment' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "UserProgress"
        ADD CONSTRAINT "UserProgress_enrollmentId_fkey"
        FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4k. UserProgress.lectureId → Lecture.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserProgress_lectureId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'UserProgress' AND column_name = 'lectureId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Lecture' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "UserProgress"
        ADD CONSTRAINT "UserProgress_lectureId_fkey"
        FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4l. UserProgress.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserProgress_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'UserProgress' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "UserProgress"
        ADD CONSTRAINT "UserProgress_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4m. Certificate.enrollmentId → Enrollment.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_enrollmentId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Certificate' AND column_name = 'enrollmentId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Enrollment' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Certificate"
        ADD CONSTRAINT "Certificate_enrollmentId_fkey"
        FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4n. Certificate.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Certificate' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Certificate"
        ADD CONSTRAINT "Certificate_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4o. Certificate.courseId → Course.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_courseId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Certificate' AND column_name = 'courseId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Certificate"
        ADD CONSTRAINT "Certificate_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4p. Review.courseId → Course.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Review_courseId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Review' AND column_name = 'courseId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Course' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Review"
        ADD CONSTRAINT "Review_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4q. Review.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Review_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Review' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "Review"
        ADD CONSTRAINT "Review_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4r. DeviceSession.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DeviceSession_userId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'DeviceSession' AND column_name = 'userId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "DeviceSession"
        ADD CONSTRAINT "DeviceSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4s. AdminApprovalQueue.paymentId → Payment.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AdminApprovalQueue_paymentId_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminApprovalQueue' AND column_name = 'paymentId' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Payment' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "AdminApprovalQueue"
        ADD CONSTRAINT "AdminApprovalQueue_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Step 5: Set DEFAULT gen_random_uuid() on all id columns
--         (pgcrypto extension must be enabled for gen_random_uuid)
-- ============================================================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_name IN (
            'User', 'UserAuth', 'UserRegistration',
            'Course', 'Lecture',
            'Enrollment', 'Payment',
            'UserProgress', 'Certificate',
            'Review', 'DeviceSession', 'AdminApprovalQueue'
        )
          AND column_name = 'id'
          AND data_type = 'uuid'
          AND (is_nullable = 'YES' OR column_default IS NULL OR column_default != 'gen_random_uuid()')
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
            col_record.table_name
        );
        RAISE NOTICE 'Set DEFAULT gen_random_uuid() on %.id', col_record.table_name;
    END LOOP;
END $$;

-- ============================================================================
-- Step 6: Verification — show the updated schema
-- ============================================================================
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name IN (
    'User', 'UserAuth', 'UserRegistration',
    'Course', 'Lecture',
    'Enrollment', 'Payment',
    'UserProgress', 'Certificate',
    'Review', 'DeviceSession', 'AdminApprovalQueue'
)
  AND (column_name = 'id' OR column_name IN ('userId', 'courseId', 'instructorId',
                                              'enrollmentId', 'lectureId', 'paymentId',
                                              'reviewedBy', 'approvedBy'))
ORDER BY table_name, ordinal_position;

-- If we get here, everything succeeded — release the savepoint
RELEASE SAVEPOINT migrate_text_to_uuid;

COMMIT;
