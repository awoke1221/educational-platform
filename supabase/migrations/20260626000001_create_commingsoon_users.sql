-- ============================================
-- Create commingsoon_users table
-- COMPLETELY ISOLATED from User, Enrollment,
-- Payment, Course, and all other existing tables
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS "commingsoon_users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    "email" TEXT,                        -- Required for diaspora
    "phoneNumber" TEXT,                  -- Required for local
    "gender" TEXT NOT NULL,              -- Collected from both
    "locationType" TEXT NOT NULL,        -- 'local' | 'diaspora'
    "country" TEXT,                      -- Country for diaspora registrations
    "source" TEXT NOT NULL DEFAULT 'homepage', -- 'homepage' | 'courses' | 'register'
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "commingsoon_users_email_idx" ON "commingsoon_users"("email");
CREATE INDEX IF NOT EXISTS "commingsoon_users_phone_idx" ON "commingsoon_users"("phoneNumber");
CREATE INDEX IF NOT EXISTS "commingsoon_users_source_idx" ON "commingsoon_users"("source");
CREATE INDEX IF NOT EXISTS "commingsoon_users_submittedAt_idx" ON "commingsoon_users"("submittedAt");
CREATE INDEX IF NOT EXISTS "commingsoon_users_country_idx" ON "commingsoon_users"("country");

-- Enable Row Level Security
ALTER TABLE "commingsoon_users" ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public signup form)
CREATE POLICY "Anyone can insert commingsoon_users"
  ON "commingsoon_users"
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only service_role can read/update/delete
CREATE POLICY "Only service can select commingsoon_users"
  ON "commingsoon_users"
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service can update commingsoon_users"
  ON "commingsoon_users"
  FOR UPDATE
  USING (auth.role() = 'service_role');
