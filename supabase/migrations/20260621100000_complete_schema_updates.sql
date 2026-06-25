-- Complete Supabase schema updates and migrations
-- Run this whole file in Supabase SQL editor (https://app.supabase.com) for your project.
-- It: enables UUID extensions, adds missing columns, sets id defaults to gen_random_uuid()::text,
-- ensures Payment payer columns exist, and populates User.fullName/phoneNumber from auth.users metadata.

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Add missing User columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingReceiptUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'none';

-- 3) Ensure Payment payer columns exist
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payerName" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payerPhone" TEXT;

-- 4) Ensure indexes used by the app
CREATE INDEX IF NOT EXISTS "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX IF NOT EXISTS "User_paymentStatus_idx" ON "User"("paymentStatus");

-- 5) Set default id generation to gen_random_uuid()::text for core tables (if id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"User"' AND column_name='id') THEN
    ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"Course"' AND column_name='id') THEN
    ALTER TABLE "Course" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"Lecture"' AND column_name='id') THEN
    ALTER TABLE "Lecture" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"Enrollment"' AND column_name='id') THEN
    ALTER TABLE "Enrollment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"UserProgress"' AND column_name='id') THEN
    ALTER TABLE "UserProgress" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"Payment"' AND column_name='id') THEN
    ALTER TABLE "Payment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"Certificate"' AND column_name='id') THEN
    ALTER TABLE "Certificate" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"DeviceSession"' AND column_name='id') THEN
    ALTER TABLE "DeviceSession" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='"AdminApprovalQueue"' AND column_name='id') THEN
    ALTER TABLE "AdminApprovalQueue" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
  END IF;
END$$;

-- Use a safe dynamic update: detect which metadata columns exist and reference only those
DO $$
DECLARE
  col1 TEXT;
  col2 TEXT;
  sql TEXT;
BEGIN
  col1 := NULL;
  col2 := NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'user_metadata'
  ) THEN
    col1 := 'user_metadata';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data'
  ) THEN
    col2 := 'raw_user_meta_data';
  END IF;

  IF col1 IS NULL AND col2 IS NULL THEN
    RAISE NOTICE 'No auth.users metadata columns found; skipping user population.';
    RETURN;
  END IF;

  sql := 'UPDATE "User" u SET "fullName" = COALESCE(NULLIF(u."fullName", '''')';

  IF col1 IS NOT NULL THEN
    sql := sql || ', a.' || quote_ident(col1) || '->> ''full_name'', a.' || quote_ident(col1) || '->> ''name''';
  END IF;
  IF col2 IS NOT NULL THEN
    sql := sql || ', a.' || quote_ident(col2) || '->> ''full_name'', a.' || quote_ident(col2) || '->> ''name''';
  END IF;

  sql := sql || '), "phoneNumber" = COALESCE(NULLIF(u."phoneNumber", '''')';

  IF col1 IS NOT NULL THEN
    sql := sql || ', a.' || quote_ident(col1) || '->> ''phone'', a.' || quote_ident(col1) || '->> ''phone_number''';
  END IF;
  IF col2 IS NOT NULL THEN
    sql := sql || ', a.' || quote_ident(col2) || '->> ''phone'', a.' || quote_ident(col2) || '->> ''phone_number''';
  END IF;

  sql := sql || ') FROM auth.users a WHERE u.id = a.id::text AND (u."fullName" IS NULL OR u."fullName" = '''' OR u."phoneNumber" IS NULL OR u."phoneNumber" = '''')';

  EXECUTE sql;
END$$;

-- 7) Optional: verify results (uncomment to run)
-- SELECT id, username, email, "fullName", "phoneNumber" FROM "User" ORDER BY "createdAt" DESC LIMIT 50;

-- 8) Notes:
-- - If you're using PostgREST / Supabase REST, you may need to refresh the schema cache or restart the DB to avoid PGRST204 errors.
-- - The app currently supplies UUIDs server-side; setting these defaults lets the DB generate IDs if you prefer.

-- End of migration
