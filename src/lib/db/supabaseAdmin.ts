// src/lib/db/supabaseAdmin.ts
// Server-only Supabase Admin Client
//
// IMPORTANT: The `supabaseAdmin` export is a lazy getter (Proxy) so it
// is NOT evaluated at module load time. Module-level evaluation breaks
// on Vercel because env vars like SUPABASE_SERVICE_ROLE_KEY aren't
// available during the build/bundling phase.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase admin client is not configured: NEXT_PUBLIC_SUPABASE_URL is missing.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient();
  }
  return supabaseAdminClient;
}

function getSupabaseAdminOptional(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

// ── Lazy getter helper ───────────────────────────────────
// Returns the admin client, or null if env vars are missing.
// Safe to call on the client side (returns null).
function resolveAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") return null;
  return getSupabaseAdminOptional();
}

// ── Proxy-based lazy getter ──────────────────────────────
// This is NOT evaluated at module load time. Each property access
// (e.g. supabaseAdmin.from(...)) triggers resolveAdmin() lazily.
// This fixes the Vercel build issue where module-level code runs
// before env vars are injected.
const noopClient = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === "then" || prop === "catch") return undefined;
      // Return a function that produces another noop proxy for chaining
      return () =>
        Promise.resolve(
          new Proxy(
            { data: null, error: new Error("Supabase admin not initialized") },
            {
              get(target, p) {
                if (p === "then" || p === "catch") return undefined;
                return (target as any)[p] ?? (() => Promise.resolve(target));
              },
            },
          ),
        );
    },
  },
) as SupabaseClient;

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_, prop) {
      const client = resolveAdmin();
      if (!client) return (noopClient as any)[prop];
      return (client as any)[prop];
    },
  },
) as SupabaseClient;
