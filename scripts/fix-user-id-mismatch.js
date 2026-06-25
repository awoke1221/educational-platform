// Fix User ID mismatch between auth.users and public.User table
// Usage: node scripts/fix-user-id-mismatch.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixUserId(email, oldId, newId) {
  console.log("Fixing ID mismatch for:", email);
  console.log("  Old ID:", oldId);
  console.log("  New ID:", newId);
  console.log("");

  // Step 1: Get old user data (without the id)
  const { data: oldUser } = await sa
    .from("User")
    .select("*")
    .eq("id", oldId)
    .single();
  if (!oldUser) {
    console.log("❌ Old user not found");
    return;
  }
  console.log("  User found:", oldUser.email, "(" + oldUser.fullName + ")");
  console.log("  Username:", oldUser.username);

  // Step 2: Delete the old UserAuth and UserRegistration records first (they have FK to User)
  for (const table of ["UserAuth", "UserRegistration"]) {
    const { data: recs } = await sa
      .from(table)
      .select("id")
      .eq("userId", oldId);
    if (recs && recs.length > 0) {
      for (const r of recs) {
        await sa.from(table).delete().eq("id", r.id);
        console.log("  Deleted " + table + " record: " + r.id);
      }
    }
  }

  // Step 3: Delete old user
  const { error: delErr } = await sa.from("User").delete().eq("id", oldId);
  if (delErr) {
    console.log("  ❌ Could not delete old user:", delErr.message);
    return;
  }
  console.log("  ✅ Old user deleted");

  // Step 4: Create new user with the CORRECT auth ID
  const { id, ...userData } = oldUser;
  const { error: insErr } = await sa.from("User").insert({
    id: newId,
    ...userData,
  });
  if (insErr) {
    console.log("  ❌ Insert new user failed:", insErr.message);
    return;
  }
  console.log("  ✅ New user created with correct ID");

  // Verify
  const { data: v } = await sa
    .from("User")
    .select("id, email, role")
    .eq("id", newId)
    .maybeSingle();
  const { data: authUsers } = await sa.auth.admin.listUsers();
  const authUser = authUsers.users.find((u) => u.email === email);
  const match = v && authUser && v.id === authUser.id;
  console.log("");
  console.log("  User table ID:", v ? v.id : "NOT FOUND");
  console.log("  Auth users ID:", authUser ? authUser.id : "NOT FOUND");
  console.log("  Match:", match ? "✅ YES" : "❌ NO");
}

// Run for testuser3
fixUserId(
  "testuser3@test.com",
  "03d4bd2c-e199-4311-af08-50cffbf5aa2f",
  "bed590c9-a65d-4cf4-8d67-e9bcec5fe7a6",
).catch(console.error);
