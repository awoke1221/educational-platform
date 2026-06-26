// Run this script to create the commingsoon_users table
// node scripts/apply-commingsoon-table.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://gsiqibgpimazfivfrtxz.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = `
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the table
CREATE TABLE IF NOT EXISTS "commingsoon_users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "gender" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "commingsoon_users_email_idx" ON "commingsoon_users"("email");
CREATE INDEX IF NOT EXISTS "commingsoon_users_phone_idx" ON "commingsoon_users"("phoneNumber");
CREATE INDEX IF NOT EXISTS "commingsoon_users_source_idx" ON "commingsoon_users"("source");
CREATE INDEX IF NOT EXISTS "commingsoon_users_submittedAt_idx" ON "commingsoon_users"("submittedAt");

-- Row Level Security
ALTER TABLE "commingsoon_users" ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public signup form)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commingsoon_users' AND policyname = 'Anyone can insert commingsoon_users') THEN
    CREATE POLICY "Anyone can insert commingsoon_users"
      ON "commingsoon_users" FOR INSERT TO anon WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commingsoon_users' AND policyname = 'Only service can select commingsoon_users') THEN
    CREATE POLICY "Only service can select commingsoon_users"
      ON "commingsoon_users" FOR SELECT USING (auth.role() = 'service_role');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commingsoon_users' AND policyname = 'Only service can update commingsoon_users') THEN
    CREATE POLICY "Only service can update commingsoon_users"
      ON "commingsoon_users" FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END
$$;
`;

async function main() {
  console.log("Running migration...");
  const { data, error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    // Try direct query instead
    console.log("RPC not available, trying direct query...");
    const { error: queryError } = await supabase
      .from("commingsoon_users")
      .select("id")
      .limit(1);

    if (queryError && queryError.code === "42P01") {
      // Table doesn't exist - need to create via SQL editor
      console.error(`
═══════════════════════════════════════════════════════════
  TABLE NEEDS TO BE CREATED MANUALLY
═══════════════════════════════════════════════════════════

  Please go to your Supabase dashboard SQL Editor:
  https://supabase.com/dashboard/project/gsiqibgpimazfivfrtxz/sql/new

  And paste the contents of:
  scripts/apply-commingsoon-migration.sql

  Then click "Run" or press Ctrl+Enter.
═══════════════════════════════════════════════════════════
`);
    } else if (!queryError) {
      console.log(
        "✅ Table 'commingsoon_users' already exists and is accessible!",
      );
    } else {
      console.log("Table check result:", queryError.message);
    }
    process.exit(1);
  }

  console.log("✅ Migration completed successfully!");
}

main().catch(console.error);
