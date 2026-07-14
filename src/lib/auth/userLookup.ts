import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";

export interface UserLookupOptions {
  authUserId?: string | null;
  email?: string | null;
  lookupByEmail?: (email: string) => Promise<string | null | undefined>;
}

export async function resolveUserLookupIds({
  authUserId,
  email,
  lookupByEmail,
}: UserLookupOptions): Promise<string[]> {
  const ids = new Set<string>();

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

export async function resolveUserIdForAuth(
  authUserId: string | null,
  email?: string | null,
): Promise<string | null> {
  if (authUserId) {
    return authUserId;
  }

  if (!email) {
    return null;
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: user } = await admin!
      .from("User")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    return user?.id ?? null;
  } catch {
    return null;
  }
}
