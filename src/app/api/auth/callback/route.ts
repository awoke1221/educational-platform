// src/app/api/auth/callback/route.ts
// Supabase Auth OAuth callback
//
// After the user completes Google (or other provider) sign-in,
// Supabase redirects here with an authorization code. This route
// exchanges the code for a session and creates / updates the
// custom User profile row.
//
// GET  /api/auth/callback?code=...&provider=google

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const next = request.nextUrl.searchParams.get("next") || "/dashboard";

    if (!code) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=missing_code", request.url),
      );
    }

    // ── Exchange the auth code for a session ───────────────────────
    const supabase = getSupabaseAnon();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("[CALLBACK EXCHANGE ERROR]", error);
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=exchange_failed", request.url),
      );
    }

    const { user: authUser, session } = data;

    // ── Upsert the custom User profile ─────────────────────────────
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const provider = authUser.app_metadata?.provider || "google";
    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "User";
    const avatarUrl =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null;

    // Derive a username from the email
    const email = authUser.email!;
    const usernameBase = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "");
    const username =
      usernameBase || `user_${crypto.randomBytes(3).toString("hex")}`;

    const { data: existingProfile } = await supabaseAdmin!
      .from("User")
      .select("id, loginCount")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      await supabaseAdmin!
        .from("User")
        .update({
          fullName,
          profileImage: avatarUrl,
          authProvider: provider,
          authProviderUserId: authUser.identities?.[0]?.id || null,
          lastLogin: now,
          loginCount: (existingProfile.loginCount || 0) + 1,
          updatedAt: now,
        })
        .eq("id", authUser.id);
    } else {
      // Create new profile
      await supabaseAdmin!
        .from("User")
        .insert({
          id: authUser.id,
          username: username.toLowerCase(),
          email,
          fullName,
          profileImage: avatarUrl,
          phoneNumber: "",
          role: "user",
          isActive: true,
          isApproved: true,
          authProvider: provider,
          authProviderUserId: authUser.identities?.[0]?.id || null,
          loginCount: 1,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        })
        .select("id")
        .single()
        .catch((err) => console.error("[CALLBACK PROFILE INSERT ERROR]", err));
    }

    // ── Redirect to the app with the session ───────────────────────
    // We set the session tokens as cookies so the client-side Supabase
    // client can pick them up on the destination page.
    const redirectUrl = new URL(next, request.url);

    const response = NextResponse.redirect(redirectUrl);

    if (session) {
      response.cookies.set("sb-access-token", session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: session.expires_in,
      });
      response.cookies.set("sb-refresh-token", session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("[CALLBACK ERROR]", error);
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback_failed", request.url),
    );
  }
}
