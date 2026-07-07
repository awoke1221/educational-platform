-- Add diaspora-specific coaching fields to commingsoon_users
ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "diasporaCoachingMode" TEXT
  DEFAULT NULL
  CHECK ("diasporaCoachingMode" IS NULL OR "diasporaCoachingMode" IN ('online', 'one-on-one'));

ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "tiktokUsername" TEXT
  DEFAULT NULL;

ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "coachingGoal" TEXT
  DEFAULT NULL;

ALTER TABLE "commingsoon_users"
ADD COLUMN IF NOT EXISTS "tiktokPurpose" TEXT
  DEFAULT NULL;

COMMENT ON COLUMN "commingsoon_users"."diasporaCoachingMode" IS 'Diaspora coaching preference: online or one-on-one';
COMMENT ON COLUMN "commingsoon_users"."tiktokUsername" IS 'TikTok username for one-on-one diaspora coaching';
COMMENT ON COLUMN "commingsoon_users"."coachingGoal" IS 'What the diaspora learner is looking for';
COMMENT ON COLUMN "commingsoon_users"."tiktokPurpose" IS 'Whether the TikTok account is for personal or business use';

DROP FUNCTION IF EXISTS fast_register_commingsoon(
  p_fullName TEXT,
  p_email TEXT,
  p_phoneNumber TEXT,
  p_gender TEXT,
  p_country TEXT,
  p_locationType TEXT,
  p_attendanceMode TEXT,
  p_source TEXT
);

CREATE OR REPLACE FUNCTION fast_register_commingsoon(
  p_fullName            TEXT,
  p_email               TEXT DEFAULT NULL,
  p_phoneNumber         TEXT DEFAULT NULL,
  p_gender              TEXT DEFAULT NULL,
  p_country             TEXT DEFAULT NULL,
  p_locationType        TEXT DEFAULT NULL,
  p_attendanceMode      TEXT DEFAULT NULL,
  p_diasporaCoachingMode TEXT DEFAULT NULL,
  p_tiktokUsername      TEXT DEFAULT NULL,
  p_coachingGoal        TEXT DEFAULT NULL,
  p_tiktokPurpose       TEXT DEFAULT NULL,
  p_source              TEXT DEFAULT 'homepage'
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

  IF p_locationType = 'diaspora' AND p_diasporaCoachingMode = 'one-on-one' AND (
    p_phoneNumber IS NULL OR p_phoneNumber = '' OR
    p_tiktokUsername IS NULL OR p_tiktokUsername = '' OR
    p_coachingGoal IS NULL OR p_coachingGoal = '' OR
    p_tiktokPurpose IS NULL OR p_tiktokPurpose = ''
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'One-on-one diaspora registrations need phone number, TikTok username, coaching goal, and purpose'::TEXT;
    RETURN;
  END IF;

  INSERT INTO "commingsoon_users" (
    "fullName",
    "email",
    "phoneNumber",
    "gender",
    "country",
    "locationType",
    "attendanceMode",
    "diasporaCoachingMode",
    "tiktokUsername",
    "coachingGoal",
    "tiktokPurpose",
    "source"
  ) VALUES (
    TRIM(p_fullName),
    LOWER(TRIM(p_email)),
    TRIM(p_phoneNumber),
    p_gender,
    TRIM(p_country),
    p_locationType,
    p_attendanceMode,
    p_diasporaCoachingMode,
    TRIM(p_tiktokUsername),
    TRIM(p_coachingGoal),
    p_tiktokPurpose,
    p_source
  )
  ON CONFLICT DO NOTHING
  RETURNING "commingsoon_users"."id" INTO v_id;

  IF v_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM "commingsoon_users" WHERE "email" = LOWER(TRIM(p_email)) AND "email" IS NOT NULL) THEN
      RETURN QUERY SELECT false, NULL::UUID, 'This email is already registered'::TEXT;
    ELSIF EXISTS (SELECT 1 FROM "commingsoon_users" WHERE "phoneNumber" = TRIM(p_phoneNumber) AND "phoneNumber" IS NOT NULL) THEN
      RETURN QUERY SELECT false, NULL::UUID, 'This phone number is already registered'::TEXT;
    ELSE
      RETURN QUERY SELECT false, NULL::UUID, 'You are already registered'::TEXT;
    END IF;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_id, NULL::TEXT;
END;
$$;
