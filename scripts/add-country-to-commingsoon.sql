-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/gsiqibgpimazfivfrtxz/sql/new)
-- Or run: psql "$DATABASE_URL" -f scripts/add-country-to-commingsoon.sql

-- ============================================
-- Add country column to commingsoon_users
-- For diaspora registrations to select their country
-- ============================================

-- Add the country column (nullable since local users don't need it)
ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "country" TEXT;

-- Add index for efficient querying by country
CREATE INDEX IF NOT EXISTS "commingsoon_users_country_idx" ON "commingsoon_users"("country");
