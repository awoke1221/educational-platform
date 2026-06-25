-- ============================================================================
-- Migration: Drop Redundant Columns from AdminApprovalQueue
-- Description: userId, courseId, amount, and receiptScreenshotUrl are already
--              stored in the Payment table. Keeping them in AdminApprovalQueue
--              creates a risk of data drift. This migration removes them and
--              relies on JOINs to Payment instead.
--
--              After this migration, AdminApprovalQueue will have only:
--              id, paymentId, submittedAt, viewedAt, isReviewed
--
--              Safe to re-run — each DROP uses IF EXISTS.
-- ============================================================================

-- ============================================================================
-- Drop redundant columns one at a time with existence checks.
-- We also rebuild the index on paymentId since the table structure changes.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminApprovalQueue' AND column_name = 'userId'
    ) THEN
        ALTER TABLE "AdminApprovalQueue" DROP COLUMN "userId";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminApprovalQueue' AND column_name = 'courseId'
    ) THEN
        ALTER TABLE "AdminApprovalQueue" DROP COLUMN "courseId";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminApprovalQueue' AND column_name = 'amount'
    ) THEN
        ALTER TABLE "AdminApprovalQueue" DROP COLUMN "amount";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminApprovalQueue' AND column_name = 'receiptScreenshotUrl'
    ) THEN
        ALTER TABLE "AdminApprovalQueue" DROP COLUMN "receiptScreenshotUrl";
    END IF;
END $$;

-- Rebuild the index on paymentId (optional, for cleanliness)
DROP INDEX IF EXISTS "AdminApprovalQueue_paymentId_idx";
CREATE INDEX "AdminApprovalQueue_paymentId_idx" ON "AdminApprovalQueue"("paymentId");

-- The isReviewed index is still useful for filtering unreviewed items
-- (it already exists from the original schema, so we leave it).
