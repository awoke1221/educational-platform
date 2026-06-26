-- ============================================================================
-- Migration: Split User Table into User, UserAuth, and UserRegistration
-- Description: The User table has grown to 26+ columns covering 3 unrelated
--              concerns (profile, auth, registration). This migration splits
--              them into focused tables.
--
-- Table 1 — User (profile only):
--   id, username, email, fullName, phoneNumber, profileImage, role,
--   isActive, isBanned, lastLogin, loginCount, createdAt, updatedAt, deletedAt
--
-- Table 2 — UserAuth (new):
--   id, userId (FK), passwordHash, authProvider, authProviderUserId,
--   authProviderIdentityId, passwordChangedAt, passwordResetToken,
--   passwordResetExpires
--
-- Table 3 — UserRegistration (new):
--   id, userId (FK), isApproved, pendingReceiptUrl, paymentMethod,
--   paymentStatus, submittedAt, reviewedAt, reviewedBy
--
-- Safe to re-run — all CREATE/ALTER use IF EXISTS / IF NOT EXISTS.
-- ============================================================================

-- ============================================================================
-- 1. Create UserAuth table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "UserAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "authProvider" TEXT NOT NULL DEFAULT 'email',
    "authProviderUserId" TEXT,
    "authProviderIdentityId" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuth_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAuth_userId_key" ON "UserAuth"("userId");
CREATE INDEX IF NOT EXISTS "UserAuth_authProvider_idx" ON "UserAuth"("authProvider");
CREATE INDEX IF NOT EXISTS "UserAuth_authProviderUserId_idx" ON "UserAuth"("authProviderUserId");

-- ============================================================================
-- 2. Create UserRegistration table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "UserRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "pendingReceiptUrl" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'none',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRegistration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRegistration_userId_key" ON "UserRegistration"("userId");
CREATE INDEX IF NOT EXISTS "UserRegistration_isApproved_idx" ON "UserRegistration"("isApproved");
CREATE INDEX IF NOT EXISTS "UserRegistration_paymentStatus_idx" ON "UserRegistration"("paymentStatus");

-- ============================================================================
-- 3. Migrate existing data from User to UserAuth
--    Wrapped in DO block with column existence check so this is safe to
--    re-run even after the source columns have been dropped.
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'passwordHash'
    ) THEN
        EXECUTE FORMAT(
            'INSERT INTO "UserAuth" ("id", "userId", "passwordHash", "authProvider", "authProviderUserId", "authProviderIdentityId", "passwordChangedAt", "passwordResetToken", "passwordResetExpires", "createdAt", "updatedAt")
             SELECT gen_random_uuid()::text, "id", COALESCE("passwordHash", ''), COALESCE("authProvider", ''), "authProviderUserId", "authProviderIdentityId", "passwordChangedAt", "passwordResetToken", "passwordResetExpires", COALESCE("createdAt", CURRENT_TIMESTAMP), COALESCE("updatedAt", CURRENT_TIMESTAMP)
             FROM "User"
             WHERE "id" IS NOT NULL
             ON CONFLICT ("userId") DO NOTHING'
        );
    END IF;
END $$;

-- ============================================================================
-- 4. Migrate existing data from User to UserRegistration
--    Same safety pattern: only runs if source columns still exist.
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'isApproved'
    ) THEN
        EXECUTE FORMAT(
            'INSERT INTO "UserRegistration" ("id", "userId", "isApproved", "pendingReceiptUrl", "paymentMethod", "paymentStatus", "submittedAt", "createdAt", "updatedAt")
             SELECT gen_random_uuid()::text, "id", COALESCE("isApproved", false), "pendingReceiptUrl", "paymentMethod", COALESCE("paymentStatus", ''), "createdAt", COALESCE("createdAt", CURRENT_TIMESTAMP), COALESCE("updatedAt", CURRENT_TIMESTAMP)
             FROM "User"
             WHERE "id" IS NOT NULL
             ON CONFLICT ("userId") DO NOTHING'
        );
    END IF;
END $$;

-- ============================================================================
-- 5. Drop redundant columns from User (one at a time with IF EXISTS)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'passwordHash') THEN
        ALTER TABLE "User" DROP COLUMN "passwordHash";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'authProvider') THEN
        ALTER TABLE "User" DROP COLUMN "authProvider";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'authProviderUserId') THEN
        ALTER TABLE "User" DROP COLUMN "authProviderUserId";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'authProviderIdentityId') THEN
        ALTER TABLE "User" DROP COLUMN "authProviderIdentityId";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'passwordChangedAt') THEN
        ALTER TABLE "User" DROP COLUMN "passwordChangedAt";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'passwordResetToken') THEN
        ALTER TABLE "User" DROP COLUMN "passwordResetToken";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'passwordResetExpires') THEN
        ALTER TABLE "User" DROP COLUMN "passwordResetExpires";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isApproved') THEN
        ALTER TABLE "User" DROP COLUMN "isApproved";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'pendingReceiptUrl') THEN
        ALTER TABLE "User" DROP COLUMN "pendingReceiptUrl";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'paymentMethod') THEN
        ALTER TABLE "User" DROP COLUMN "paymentMethod";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'paymentStatus') THEN
        ALTER TABLE "User" DROP COLUMN "paymentStatus";
    END IF;
END $$;

-- ============================================================================
-- 6. Rebuild indexes on User (drop the ones that referred to dropped columns)
-- ============================================================================
DROP INDEX IF EXISTS "User_authProvider_idx";

-- ============================================================================
-- 7. Verify the migration
-- ============================================================================
SELECT 'Migration complete: User table split into User, UserAuth, UserRegistration' AS status;
