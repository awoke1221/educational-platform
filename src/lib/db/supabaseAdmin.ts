// src/lib/db/supabaseAdmin.ts
// Server-only Supabase Admin Client

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  // The singleton pattern (re-used across all requests within one server instance)
  // is the connection-pooling mechanism for the JS client — it ensures only one
  // HTTP client exists per process, preventing connection exhaustion at the
  // Supabase Kong gateway layer.
  // Database-level pooling is handled by Supabase's built-in PgBouncer.

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient();
  }
  return supabaseAdminClient;
}

export function getSupabaseAdminOptional(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

export const supabaseAdmin =
  typeof window === "undefined" ? getSupabaseAdminOptional() : null;
