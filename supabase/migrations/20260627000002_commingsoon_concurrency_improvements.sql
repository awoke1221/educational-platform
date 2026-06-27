-- ============================================
-- Comming Soon — Concurrency & Performance
-- ============================================
-- This migration adds:
--   1. Partial unique indexes for non-null email/phone
--   2. A dedicated stored procedure for fast inserts
--      with built-in ON CONFLICT handling
--   3. pg_stat_statements for query monitoring
--   4. Table statistics tuning for the commingsoon_users table
-- ============================================

-- ── 1. Partial Unique Indexes ─────────────────────────
-- These allow the DB to enforce "no duplicate emails" for diaspora users
-- and "no duplicate phones" for local users, while still allowing NULLs
-- (which are ignored by Postgres unique constraints).
--
-- Without these, duplicate detection relies on the application catching
-- error code 23505 — which is slower and less reliable.

-- Only enforce uniqueness on non-null emails (diaspora users)
DROP INDEX IF EXISTS "commingsoon_users_email_unique";
CREATE UNIQUE INDEX "commingsoon_users_email_unique"
  ON "commingsoon_users"("email")
  WHERE "email" IS NOT NULL;

-- Only enforce uniqueness on non-null phone numbers (local users)
DROP INDEX IF EXISTS "commingsoon_users_phone_unique";
CREATE UNIQUE INDEX "commingsoon_users_phone_unique"
  ON "commingsoon_users"("phoneNumber")
  WHERE "phoneNumber" IS NOT NULL;

-- ── 2. Composite Index for Dupe Checking ──────────────
-- When a user submits, we often check "has this email OR phone already registered?"
-- A composite index makes this fast.
DROP INDEX IF EXISTS "commingsoon_users_email_phone_dupe_idx";
CREATE INDEX "commingsoon_users_email_phone_dupe_idx"
  ON "commingsoon_users"("email", "phoneNumber");

-- ── 3. Stored Procedure: fast_register_commingsoon ────
-- Single round-trip insert with built-in duplicate detection.
-- Returns (success, id, error_message) — no 23505 error handling needed.
--
-- Why this is faster for concurrent users:
--   a) One network round trip instead of two (insert + select)
--   b) Pre-compiled — Postgres caches the execution plan
--   c) Atomic — the entire operation is a single transaction
--   d) No ORM overhead — @supabase/supabase-js adds serialization cost

CREATE OR REPLACE FUNCTION fast_register_commingsoon(
  p_fullName      TEXT,
  p_email         TEXT DEFAULT NULL,
  p_phoneNumber   TEXT DEFAULT NULL,
  p_gender        TEXT DEFAULT NULL,
  p_country       TEXT DEFAULT NULL,
  p_locationType  TEXT DEFAULT NULL,
  p_source        TEXT DEFAULT 'homepage'
)
RETURNS TABLE(
  success     BOOLEAN,
  id          UUID,
  error_msg   TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Validate required fields
  IF p_fullName IS NULL OR p_fullName = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Full name is required'::TEXT;
    RETURN;
  END IF;

  IF p_gender IS NULL OR p_gender = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Gender is required'::TEXT;
    RETURN;
  END IF;

  IF p_locationType NOT IN ('local', 'diaspora') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid location type'::TEXT;
    RETURN;
  END IF;

  IF p_locationType = 'diaspora' AND (p_email IS NULL OR p_email = '') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email is required for diaspora registration'::TEXT;
    RETURN;
  END IF;

  IF p_locationType = 'local' AND (p_phoneNumber IS NULL OR p_phoneNumber = '') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Phone number is required for local registration'::TEXT;
    RETURN;
  END IF;

  -- Attempt insert with ON CONFLICT for duplicate handling
  INSERT INTO "commingsoon_users" (
    "fullName",
    "email",
    "phoneNumber",
    "gender",
    "country",
    "locationType",
    "source"
  ) VALUES (
    TRIM(p_fullName),
    LOWER(TRIM(p_email)),
    TRIM(p_phoneNumber),
    p_gender,
    TRIM(p_country),
    p_locationType,
    p_source
  )
  ON CONFLICT DO NOTHING  -- Partial unique indexes will catch dupes
  RETURNING "commingsoon_users"."id" INTO v_id;

  -- If v_id is NULL, it means ON CONFLICT prevented the insert (duplicate)
  IF v_id IS NULL THEN
    -- Determine which field caused the duplicate for a helpful error message
    IF EXISTS (SELECT 1 FROM "commingsoon_users" WHERE "email" = LOWER(TRIM(p_email)) AND "email" IS NOT NULL) THEN
      RETURN QUERY SELECT false, NULL::UUID, 'This email is already registered'::TEXT;
    ELSIF EXISTS (SELECT 1 FROM "commingsoon_users" WHERE "phoneNumber" = TRIM(p_phoneNumber) AND "phoneNumber" IS NOT NULL) THEN
      RETURN QUERY SELECT false, NULL::UUID, 'This phone number is already registered'::TEXT;
    ELSE
      RETURN QUERY SELECT false, NULL::UUID, 'You are already registered'::TEXT;
    END IF;
    RETURN;
  END IF;

  -- Success
  RETURN QUERY SELECT true, v_id, NULL::TEXT;
END;
$$;

-- ── 4. Enable pg_stat_statements (monitoring) ─────────
-- This extension lets you track query performance:
--   SELECT * FROM pg_stat_statements ORDER BY total_time DESC;
-- to see which queries are slow or called most often.
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── 5. Table Statistics Tuning ────────────────────────
-- For a table that grows quickly (many registrations), tell Postgres
-- to sample more rows during ANALYZE for better query plans.
ALTER TABLE "commingsoon_users" SET (
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_scale_factor = 0.02
);

-- ── 6. VACUUM Tuning Comment ──────────────────────────
-- The commingsoon_users table is INSERT-only (no updates, no deletes).
-- Postgres handles this pattern efficiently with HOT (Heap-Only Tuples)
-- updates, but periodic VACUUM is still needed for visibility maps.
-- The autovacuum settings above ensure it runs frequently enough.

COMMENT ON FUNCTION fast_register_commingsoon IS $$
  Fast, concurrent-safe registration for commingsoon signups.
  Uses ON CONFLICT with partial unique indexes for O(1) duplicate detection.
  One network round-trip, pre-compiled execution plan.
$$;
