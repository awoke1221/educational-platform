// src/app/api/auth/login/route.ts
// User Login — Supabase Auth + custom profile
//
// Flow:
//   1. Validate input & rate limit
//   2. Call supabase.auth.signInWithPassword()
//   3. Look up the User profile (admin client, for now)
//   4. Update lastLogin stats
//   5. Return the Supabase session + user profile

import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/schemas";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";
import { env } from "@/config/env";
import { rateLimit, resetRateLimit } from "@/lib/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ipKey = `login:ip:${ip}`;

    const ipLimit = await rateLimit(ipKey, {
      limit: env.rateLimit.login.ipMaxAttempts,
      windowMs: env.rateLimit.login.windowMs,
    });

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil((ipLimit.reset - Date.now() / 1000) / 60),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(ipLimit.reset - Date.now() / 1000)),
            "X-RateLimit-Limit": String(ipLimit.limit),
            "X-RateLimit-Remaining": String(ipLimit.remaining),
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 },
      );
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = validation.data;

    // ── Rate limit by account (email) after validation ─────────────
    const emailKey = `login:email:${email.toLowerCase()}`;

    const emailLimit = await rateLimit(emailKey, {
      limit: env.rateLimit.login.accountMaxAttempts,
      windowMs: env.rateLimit.login.windowMs,
    });

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts for this account. Please try again later.",
          retryAfter: Math.ceil((emailLimit.reset - Date.now() / 1000) / 60),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil(emailLimit.reset - Date.now() / 1000),
            ),
            "X-RateLimit-Limit": String(emailLimit.limit),
            "X-RateLimit-Remaining": String(emailLimit.remaining),
          },
        },
      );
    }

    // ============================================
    // STEP 1: Authenticate via Supabase Auth
    // ============================================
    const supabase = getSupabaseAnon();

    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

    if (signInError) {
      console.error("[LOGIN SUPABASE ERROR]", signInError);

      if (
        signInError.message?.toLowerCase().includes("invalid") ||
        signInError.message?.toLowerCase().includes("credentials")
      ) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "Login failed. Please try again later." },
        { status: 500 },
      );
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: "Login failed. No session returned." },
        { status: 500 },
      );
    }

    // ============================================
    // STEP 2: Fetch User profile
    // ============================================
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userProfile } = await supabaseAdmin!
      .from("User")
      .select(
        "id, email, username, fullName, role, isActive, isBanned, loginCount",
      )
      .eq("id", authData.user.id)
      .maybeSingle();

    // Custom guard checks (active / banned / approved)
    if (userProfile) {
      if (!userProfile.isActive) {
        return NextResponse.json(
          { error: "Account is inactive. Please contact support." },
          { status: 403 },
        );
      }
      if (userProfile.isBanned) {
        return NextResponse.json(
          { error: "Account has been banned. Please contact support." },
          { status: 403 },
        );
      }
    }

    // Account creation is allowed for both email/password and Google users.
    // Course access for paid courses remains controlled by payment review and
    // admin approval through the enrollment/payment workflow.

    // ============================================
    // STEP 3: Update last login
    // ============================================
    await supabaseAdmin!
      .from("User")
      .update({
        lastLogin: new Date().toISOString(),
        loginCount: (userProfile?.loginCount || 0) + 1,
      })
      .eq("id", authData.user.id);

    // Reset rate-limit counters on successful login
    await Promise.allSettled([resetRateLimit(ipKey), resetRateLimit(emailKey)]);

    // ============================================
    // STEP 4: Return Supabase session
    // ============================================
    const { access_token, refresh_token, expires_in, expires_at } =
      authData.session;

    const responseHeaders = new Headers();
    responseHeaders.append(
      "Set-Cookie",
      `sb-access-token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${expires_in}`,
    );
    responseHeaders.append(
      "Set-Cookie",
      `sb-refresh-token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: userProfile
          ? {
              id: userProfile.id,
              email: userProfile.email,
              username: userProfile.username,
              fullName: userProfile.fullName,
              role: userProfile.role,
            }
          : {
              id: authData.user.id,
              email: authData.user.email,
            },
        tokens: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          expiresAt: expires_at,
        },
      },
      {
        status: 200,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return NextResponse.json(
      { error: "Login failed. Please try again later." },
      { status: 500 },
    );
  }
}
