-- ==============================================================
-- SUPABASE SETUP SCRIPT — Paid Pre-Registration System
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/gsiqibgpimazfivfrtxz/sql/new)
-- ==============================================================

-- ==============================================================
-- STEP 1: Add columns to existing User table
-- ==============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingReceiptUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'none';

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX IF NOT EXISTS "User_paymentStatus_idx" ON "User"("paymentStatus");

-- ==============================================================
-- STEP 2: Create Storage Buckets (run via Dashboard instead)
-- Go to Storage → New Bucket → Name: "receipts" → Public bucket: ON
-- ==============================================================

-- ==============================================================
-- STEP 3: Create test admin user (password: admin123)
-- ==============================================================
INSERT INTO "User" (
  id, username, email, "fullName", "phoneNumber",
  "passwordHash", role, "isActive", "isApproved", "paymentStatus"
)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@lms.test',
  'Admin User',
  '+251911223344',
  '$2b$10$YIjlrJ.BdNMTIkRRh5YHOu8e1RqvBbB.0qN2c5vxXVkXl5C5aVQwC',
  'admin',
  true,
  true,
  'approved'
) ON CONFLICT (email) DO NOTHING;

-- ==============================================================
-- STEP 4: Verify the setup
-- ==============================================================
-- Run this to confirm everything worked:
-- SELECT id, username, email, role, "isApproved", "paymentStatus", "pendingReceiptUrl", "paymentMethod"
-- FROM "User"
-- ORDER BY "createdAt" DESC;
