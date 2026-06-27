-- ============================================
-- Add attendanceMode column for local users
-- ============================================
-- Local users can choose between 'in-person' and 'online'
-- This column is NULL for diaspora users.
-- ============================================

-- ── 1. Add column ─────────────────────────────
ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "attendanceMode" TEXT
  DEFAULT NULL
  CHECK ("attendanceMode" IS NULL OR "attendanceMode" IN ('in-person', 'online'));

COMMENT ON COLUMN "commingsoon_users"."attendanceMode" IS
  'Local user attendance preference: in-person or online. NULL for diaspora users.';

-- ── 2. Update stored procedure ────────────────
DROP FUNCTION IF EXISTS fast_register_commingsoon(
  p_fullName TEXT,
  p_email TEXT,
  p_phoneNumber TEXT,
  p_gender TEXT,
  p_country TEXT,
  p_locationType TEXT,
  p_source TEXT
);

CREATE OR REPLACE FUNCTION fast_register_commingsoon(
  p_fullName        TEXT,
  p_email           TEXT DEFAULT NULL,
  p_phoneNumber     TEXT DEFAULT NULL,
  p_gender          TEXT DEFAULT NULL,
  p_country         TEXT DEFAULT NULL,
  p_locationType    TEXT DEFAULT NULL,
  p_attendanceMode  TEXT DEFAULT NULL,
  p_source          TEXT DEFAULT 'homepage'
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

  IF p_locationType = 'local' AND (p_attendanceMode IS NULL OR p_attendanceMode NOT IN ('in-person', 'online')) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Attendance mode is required for local registration'::TEXT;
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
    "attendanceMode",
    "source"
  ) VALUES (
    TRIM(p_fullName),
    LOWER(TRIM(p_email)),
    TRIM(p_phoneNumber),
    p_gender,
    TRIM(p_country),
    p_locationType,
    p_attendanceMode,
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

COMMENT ON FUNCTION fast_register_commingsoon IS $$
  Fast, concurrent-safe registration for commingsoon signups.
  Uses ON CONFLICT with partial unique indexes for O(1) duplicate detection.
  One network round-trip, pre-compiled execution plan.
  Supports attendanceMode for local users ('in-person' | 'online').
$$;
