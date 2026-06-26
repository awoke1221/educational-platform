-- ============================================================================
-- Migration: Add 'rejected' to Enrollment.status check constraint
-- Description: The previous constraint only allowed active, completed,
--              cancelled, and processing. When admin rejects a payment,
--              the enrollment is set to 'rejected', which violated the
--              existing constraint.
-- ============================================================================

-- Step 1: Drop the old constraint
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS enrollment_status_check;

-- Step 2: Re-create with 'rejected' in the allowed values
ALTER TABLE "Enrollment"
ADD CONSTRAINT enrollment_status_check
CHECK (status IN ('active', 'completed', 'cancelled', 'processing', 'rejected')) NOT VALID;
