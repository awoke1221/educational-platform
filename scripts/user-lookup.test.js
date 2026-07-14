const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveUserLookupIds } = require("../src/lib/auth/userLookup");

test("returns the auth user id when it is available", async () => {
  const ids = await resolveUserLookupIds({
    authUserId: "auth-123",
    email: "student@example.com",
    lookupByEmail: async () => "legacy-456",
  });

  assert.deepEqual(ids, ["auth-123", "legacy-456"]);
});

test("falls back to the email-linked user id when the auth id is missing from the user table", async () => {
  const ids = await resolveUserLookupIds({
    authUserId: null,
    email: "student@example.com",
    lookupByEmail: async () => "legacy-456",
  });

  assert.deepEqual(ids, ["legacy-456"]);
});
