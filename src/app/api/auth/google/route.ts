// src/app/api/auth/google/route.ts
// Google OAuth — Supabase Auth
//
// This endpoint returns the Supabase OAuth URL that the frontend
// should redirect the user to. After the user completes the Google
// sign-in flow, Supabase redirects back to the callback route
// (/api/auth/callback) where the profile is created/updated.
//
// GET  /api/auth/google  →  returns { url } for the frontend to
//                            redirect the user to Google sign-in.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAnon();

    const redirectTo =
      request.nextUrl.searchParams.get("redirectTo") ||
      `${new URL(request.url).origin}/api/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("[GOOGLE OAUTH ERROR]", error);
      return NextResponse.json(
        { error: "Failed to initiate Google sign-in" },
        { status: 500 },
      );
    }

    if (!data.url) {
      return NextResponse.json(
        { error: "No OAuth URL returned" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("[GOOGLE OAUTH ERROR]", error);
    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 },
    );
  }
}
