// Set/reset password for admin user in Supabase Auth
// Run: node scripts/set-admin-password.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const ADMIN_EMAIL = "adonaytiktokacademy@gmail.com";
const ADMIN_PASSWORD = "Admin@12345";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log(`🔍 Looking up auth user: ${ADMIN_EMAIL}...`);

  // First check if user exists in auth.users
  const { data: users, error: listError } =
    await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Failed to list users:", listError);
    process.exit(1);
  }

  const existingUser = users.users.find((u) => u.email === ADMIN_EMAIL);

  if (existingUser) {
    console.log(`✅ Found existing auth user: ${existingUser.id}`);
    console.log("🔄 Updating password...");

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: ADMIN_PASSWORD,
      });

    if (updateError) {
      console.error("❌ Failed to update password:", updateError);
      process.exit(1);
    }

    console.log("✅ Password updated successfully!");
  } else {
    console.log("👤 User not found in auth.users. Creating new auth user...");

    const { data, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

    if (createError) {
      console.error("❌ Failed to create auth user:", createError);
      process.exit(1);
    }

    console.log(`✅ Auth user created with ID: ${data.user.id}`);
  }

  console.log(`\n🔐 You can now log in with:`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
}

main().catch(console.error);
