-- ============================================
-- Google OAuth & Database Migration
-- For Supabase SQL Editor
-- Go to: https://app.supabase.com/project/gsiqibgpimazfivfrtxz/sql/new
-- INSTRUCTIONS: Copy all the SQL below and paste into Supabase SQL Editor, then click "Run"
-- ============================================

-- Step 1: Add Google OAuth columns to User table if they don't exist
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN IF NOT EXISTS "authProviderUserId" TEXT,
ADD COLUMN IF NOT EXISTS "authProviderIdentityId" TEXT;

-- Step 2: Make phoneNumber nullable for Google OAuth users
ALTER TABLE "User" 
ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- Step 3: Create indexes for Google OAuth support
CREATE INDEX IF NOT EXISTS "User_authProvider_idx" ON "User"("authProvider");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Step 4: Verify migration was successful
SELECT 'Migration Complete! ✓' as status,
       COUNT(*) as user_count,
       NOW() as completed_at
FROM "User";
