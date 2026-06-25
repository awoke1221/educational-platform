-- ============================================================================
-- Migration: Add CHECK Constraints to Enum-like Columns
-- Description: Adds CHECK constraints to all columns that function as enums
--              to enforce data integrity at the database level.
-- Safe to run on a live database — each constraint uses a DO block to skip
-- creation if it already exists.
-- ============================================================================

-- ============================================================================
-- Enrollment.status
-- Allowed values: 'active', 'completed', 'cancelled', 'processing'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'enrollment_status_check'
          AND conrelid = '"Enrollment"'::regclass
    ) THEN
        ALTER TABLE "Enrollment"
        ADD CONSTRAINT enrollment_status_check
        CHECK (status IN ('active', 'completed', 'cancelled', 'processing')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Payment.status
-- Allowed values: 'pending', 'processing', 'approved', 'rejected'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_status_check'
          AND conrelid = '"Payment"'::regclass
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT payment_status_check
        CHECK (status IN ('pending', 'processing', 'approved', 'rejected')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Payment.paymentMethod
-- Allowed values: 'telebirr', 'cb_birr', 'bank_transfer', 'laki_pay'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_paymentmethod_check'
          AND conrelid = '"Payment"'::regclass
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT payment_paymentmethod_check
        CHECK ("paymentMethod" IN ('telebirr', 'cb_birr', 'bank_transfer', 'laki_pay')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Payment.paymentType
-- Allowed values: 'local', 'diaspora'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_paymenttype_check'
          AND conrelid = '"Payment"'::regclass
    ) THEN
        ALTER TABLE "Payment"
        ADD CONSTRAINT payment_paymenttype_check
        CHECK ("paymentType" IN ('local', 'diaspora')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- "User".role
-- Allowed values: 'user', 'instructor', 'admin'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_role_check'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT user_role_check
        CHECK (role IN ('user', 'instructor', 'admin')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- "User".authProvider
-- Allowed values: 'email', 'google'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_authprovider_check'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT user_authprovider_check
        CHECK ("authProvider" IN ('email', 'google')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- "User".paymentStatus
-- Allowed values: 'none', 'pending', 'approved'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_paymentstatus_check'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT user_paymentstatus_check
        CHECK ("paymentStatus" IN ('none', 'pending', 'approved')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Course.level
-- Allowed values: 'beginner', 'intermediate', 'advanced'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'course_level_check'
          AND conrelid = '"Course"'::regclass
    ) THEN
        ALTER TABLE "Course"
        ADD CONSTRAINT course_level_check
        CHECK (level IN ('beginner', 'intermediate', 'advanced')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Course.currency
-- Allowed values: 'ETB'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'course_currency_check'
          AND conrelid = '"Course"'::regclass
    ) THEN
        ALTER TABLE "Course"
        ADD CONSTRAINT course_currency_check
        CHECK (currency = 'ETB') NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- DeviceSession.deviceType
-- Allowed values: 'mobile', 'tablet', 'desktop', 'unknown'
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'devicesession_devicetype_check'
          AND conrelid = '"DeviceSession"'::regclass
    ) THEN
        ALTER TABLE "DeviceSession"
        ADD CONSTRAINT devicesession_devicetype_check
        CHECK ("deviceType" IN ('mobile', 'tablet', 'desktop', 'unknown')) NOT VALID;
    END IF;
END $$;

-- ============================================================================
-- Review.rating
-- Integer between 1 and 5
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'review_rating_check'
          AND conrelid = '"Review"'::regclass
    ) THEN
        ALTER TABLE "Review"
        ADD CONSTRAINT review_rating_check
        CHECK (rating >= 1 AND rating <= 5) NOT VALID;
    END IF;
END $$;
