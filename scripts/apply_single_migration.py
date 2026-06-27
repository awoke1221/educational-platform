"""Apply the attendance mode migration using psycopg2."""
import psycopg2
from urllib.parse import urlparse, unquote
import sys

DATABASE_URL = 'postgresql://postgres.gsiqibgpimazfivfrtxz:AdoniLMS12%24%24@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

parsed = urlparse(DATABASE_URL)
password = unquote(parsed.password)
host = parsed.hostname
port = parsed.port
user = parsed.username
dbname = parsed.path.lstrip('/')

print(f'Connecting to {host}:{port} as {user}...')

# Try with session pooler parameters
conn = psycopg2.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    dbname=dbname,
    connect_timeout=15,
    options='-c statement_timeout=30000'
)
conn.autocommit = True
print('Connected!')

# Step 1: Add column if not exists
cur = conn.cursor()
cur.execute("""
    ALTER TABLE "commingsoon_users" 
    ADD COLUMN IF NOT EXISTS "attendanceMode" TEXT 
    DEFAULT NULL 
    CHECK ("attendanceMode" IS NULL OR "attendanceMode" IN ('in-person', 'online'));
""")
print('Step 1: Column "attendanceMode" added.')

# Step 2: Drop old function
cur.execute("""
    DROP FUNCTION IF EXISTS fast_register_commingsoon(
        p_fullName TEXT, p_email TEXT, p_phoneNumber TEXT, 
        p_gender TEXT, p_country TEXT, p_locationType TEXT, p_source TEXT
    );
""")
print('Step 2: Old function dropped.')

# Step 3: Create new function
cur.execute("""
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

  INSERT INTO "commingsoon_users" (
    "fullName", "email", "phoneNumber", "gender", "country",
    "locationType", "attendanceMode", "source"
  ) VALUES (
    TRIM(p_fullName), LOWER(TRIM(p_email)), TRIM(p_phoneNumber),
    p_gender, TRIM(p_country), p_locationType, p_attendanceMode, p_source
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
""")
print('Step 3: New function created.')

# Verify
cur.execute("""
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'commingsoon_users' 
    ORDER BY ordinal_position;
""")
columns = cur.fetchall()
print()
print('commingsoon_users columns:')
for col in columns:
    print(f'  {col[0]:20s} {col[1]:15s} nullable={col[2]}')

cur.close()
conn.close()
print()
print('Migration complete!')
