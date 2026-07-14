async function resolveUserLookupIds({ authUserId, email, lookupByEmail }) {
  const ids = new Set();

  if (authUserId) {
    ids.add(authUserId);
  }

  if (email) {
    const emailUserId = lookupByEmail ? await lookupByEmail(email) : null;
    if (emailUserId) {
      ids.add(emailUserId);
    }
  }

  return Array.from(ids);
}

async function resolveUserIdForAuth(authUserId, email) {
  if (authUserId) {
    return authUserId;
  }

  if (!email) {
    return null;
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: user } = await admin
      .from("User")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

module.exports = {
  resolveUserLookupIds,
  resolveUserIdForAuth,
};
