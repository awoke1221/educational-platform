-- ============================================================================
-- Migration: Add Performance Indexes for Frequent Query Patterns
-- Description: Adds composite and partial indexes targeting the five most
--              frequent query patterns identified in production.
-- Each index uses a DO block with IF NOT EXISTS so it's safe to re-run.
-- Note: CREATE INDEX CONCURRENTLY can't run inside a transaction block, so
--       we use a regular CREATE INDEX with an existence check instead.
--       These are small partial indexes that build quickly.
-- ============================================================================

-- ============================================================================
-- Query Pattern 1: "Is user X enrolled in course Y and status is active?"
-- Table: Enrollment
-- Columns: userId, courseId, status
-- Why partial: The query always filters on status = 'active', so we index
--              only active enrollments for a smaller, faster index.
-- Note: There is already a unique index on (userId, courseId), but this
--       partial index is more targeted for the active-status check that
--       runs on every content page load.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Enrollment_userId_courseId_active_idx'
          AND tablename = 'Enrollment'
    ) THEN
        CREATE INDEX "Enrollment_userId_courseId_active_idx"
        ON "Enrollment"("userId", "courseId")
        WHERE "status" = 'active';
    END IF;
END $$;

-- ============================================================================
-- Query Pattern 2: "Get user X's progress for lecture Y inside enrollment Z"
-- Table: UserProgress
-- Columns: enrollmentId, lectureId, userId
-- Why composite: The query filters on all three columns simultaneously.
--                Although (enrollmentId, lectureId) is already unique, this
--                covering index lets the planner answer the query directly
--                from the index when userId is also included.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'UserProgress_enrollmentId_lectureId_userId_idx'
          AND tablename = 'UserProgress'
    ) THEN
        CREATE INDEX "UserProgress_enrollmentId_lectureId_userId_idx"
        ON "UserProgress"("enrollmentId", "lectureId", "userId");
    END IF;
END $$;

-- ============================================================================
-- Query Pattern 3: "List all published, non-archived courses, optionally
--                   filtered by category" — homepage listing
-- Table: Course
-- Columns: isPublished, isArchived, category, createdAt
-- Why partial: The query always filters on isPublished = true AND
--              isArchived = false, so only active courses are indexed.
-- Why composite: category is the first column for targeted lookups when
--                a category filter is provided. createdAt DESC covers the
--                typical ordering (newest first). When no category filter
--                is applied, the planner performs an index-only scan on
--                this small partial index, which is still highly efficient.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Course_published_active_list_idx'
          AND tablename = 'Course'
    ) THEN
        CREATE INDEX "Course_published_active_list_idx"
        ON "Course"("category", "createdAt" DESC)
        WHERE "isPublished" = true AND "isArchived" = false;
    END IF;
END $$;

-- ============================================================================
-- Query Pattern 4: "List all pending payments ordered by creation date"
--                  — admin approval queue
-- Table: Payment
-- Columns: status, createdAt
-- Why partial: The query always filters on status = 'pending'. Indexing
--              only pending rows keeps the index small and fast.
-- Why DESC: Admin queue typically shows newest submissions first.
-- Note: The existing "Payment_status_idx" supports filtering by status
--       but not ordering. This composite partial index covers both
--       filtering and ordering in a single index scan.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Payment_pending_createdAt_idx'
          AND tablename = 'Payment'
    ) THEN
        CREATE INDEX "Payment_pending_createdAt_idx"
        ON "Payment"("createdAt" DESC)
        WHERE "status" = 'pending';
    END IF;
END $$;

-- ============================================================================
-- Query Pattern 5: "Find a certificate by verificationCode"
--                  — public verification page
-- Table: Certificate
-- Columns: verificationCode, isValid
-- Why partial: The verification page only cares about valid certificates.
--              This partial index complements the existing unique index
--              on verificationCode by further narrowing to valid rows only.
-- Note: The existing "Certificate_verificationCode_key" unique index
--       already provides O(1) lookups. This partial index is an optional
--       optimization for the common case where isValid = true.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Certificate_valid_verificationCode_idx'
          AND tablename = 'Certificate'
    ) THEN
        CREATE INDEX "Certificate_valid_verificationCode_idx"
        ON "Certificate"("verificationCode")
        WHERE "isValid" = true;
    END IF;
END $$;
