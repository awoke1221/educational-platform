// src/lib/db/supabaseAnonClient.ts
// Shared anon-key Supabase client (singleton)
//
// Auth routes (login, register, google, callback, refresh, logout) all
// need an anon-key client to call supabase.auth.* methods.  Previously
// each route called createClient() inline, creating a separate HTTP
// connection pool per request.  This singleton is created ONCE and
// reused across all requests — one HTTP pool instead of many.
//
// IMPORTANT: This client uses the ANON key, NOT the service-role key.
// It is only for auth operations (signUp, signInWithPassword, etc.)
// that are unauthenticated or use the user's own token via setSession.
// For database queries with RLS enforcement use supabaseUserClient.ts.
// For admin-override queries use supabaseAdmin.ts.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | null = null;

export function getSupabaseAnon(): SupabaseClient {
  if (!anonClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "Supabase anon client not configured: NEXT_PUBLIC_SUPABASE_URL is missing.",
      );
    }
    if (!anonKey) {
      throw new Error(
        "Supabase anon client not configured: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
      );
    }

    anonClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return anonClient;
}
