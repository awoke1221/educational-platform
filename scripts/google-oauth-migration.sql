-- ============================================
-- Google OAuth Migration for Supabase
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/gsiqibgpimazfivfrtxz/sql/new
-- ============================================

-- Check if User table exists and has the Google OAuth columns
-- If not, add them

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN IF NOT EXISTS "authProviderUserId" TEXT,
ADD COLUMN IF NOT EXISTS "authProviderIdentityId" TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "User_authProvider_idx" ON "User"("authProvider");

-- Confirm migration
SELECT 'Google OAuth fields added successfully!' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='User' AND column_name IN ('authProvider', 'authProviderUserId', 'authProviderIdentityId');
