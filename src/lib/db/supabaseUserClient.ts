// src/lib/db/supabaseUserClient.ts
// Per-request Supabase client that respects Row-Level Security (RLS)
//
// Unlike supabaseAdmin (which uses the service-role key and bypasses
// RLS), this client is initialised with the user's own Supabase JWT
// (access token) so that all queries go through the database's RLS
// policies. Use this for all regular (user-scoped) operations.
//
// IMPORTANT: The factory functions below are lazy evaluators — they
// do NOT read env vars at module load time, which avoids build-time
// crashes on Vercel.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract the Bearer token from the incoming request.
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// ── Factory: from a raw access token ───────────────────────────────────

/**
 * Create a Supabase client that authenticates as the user identified by
 * `accessToken` (a Supabase JWT — the `access_token` returned by
 * `supabase.auth.signInWithPassword()` / `signUp()` / OAuth callback).
 *
 * All database requests made through this client will be evaluated
 * against the database's RLS policies using the user's identity from
 * the JWT.
 *
 * @param accessToken – The user's Supabase access token.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase user client cannot be created: NEXT_PUBLIC_SUPABASE_URL is missing.",
    );
  }
  if (!anonKey) {
    throw new Error(
      "Supabase user client cannot be created: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      // Server-side — never persist, never auto-refresh
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ── Factory: from a Next.js API route request ──────────────────────────

/**
 * Extract the Bearer token from `request` and create a user-scoped
 * Supabase client.  Returns `null` when no valid token is present
 * (caller should return 401).
 */
export function getUserClientFromRequest(
  request: NextRequest,
): SupabaseClient | null {
  const token = extractToken(request);
  if (!token) return null;
  return createUserClient(token);
}

/**
 * Same as `getUserClientFromRequest` but throws when the token is
 * missing — use inside a try/catch or when you have already verified
 * the caller is authenticated.
 */
export function requireUserClientFromRequest(
  request: NextRequest,
): SupabaseClient {
  const token = extractToken(request);
  if (!token) {
    throw new Error(
      "Missing or invalid Authorization header — bearer token required.",
    );
  }
  return createUserClient(token);
}
