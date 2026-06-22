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

// ── Lazy-getter Proxy ────────────────────────────────────
// Creates a chainable noop query builder so that code like:
//   await supabaseAdmin!.from("X").select("y").eq("z", v)
// doesn't crash when the admin client isn't available — it
// simply returns { data: null, error: "not initialized" }.
//
// The actual Supabase client is created lazily on first
// access, NOT at module load time. This fixes the Vercel
// build issue where env vars aren't injected yet.

const NOOP_ERR = new Error(
  "Supabase admin not initialized — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
);

/** Build a chainable noop that resolves to { data: null, error } when awaited. */
function noopChain(): any {
  const result = { data: null, error: NOOP_ERR };
  // Wrapping in Promise.resolve so `await noopChain()` yields `result`
  const promise = Promise.resolve(result);
  return new Proxy(promise, {
    get(target, prop) {
      // Forward Promise methods so `await` works
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return (target as any)[prop];
      }
      // Every other method call returns another noop chain
      return () => noopChain();
    },
  });
}

const noopClient = noopChain();

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_, prop) {
      const client = resolveAdmin();
      if (!client) {
        const val = (noopClient as any)[prop];
        return typeof val === "function" ? val : (noopClient as any)[prop];
      }
      return (client as any)[prop];
    },
  },
) as SupabaseClient;
