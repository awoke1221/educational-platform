// src/app/api/auth/login/route.ts
// User Login API Endpoint — Supabase REST API

import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { jwtService } from "@/lib/auth/jwt";
import { passwordService } from "@/lib/auth/password";
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

    const body = await request.json();

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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { data: users, error: findError } = await supabaseAdmin!
      .from("User")
      .select(
        "id, email, username, fullName, passwordHash, role, isActive, isBanned, isApproved, lastLogin, loginCount",
      )
      .eq("email", email.toLowerCase());

    if (findError) {
      console.error("[LOGIN FIND ERROR]", findError);
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }

    const user = users?.[0] || null;
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive. Please contact support." },
        { status: 403 },
      );
    }
    // Require admin approval before allowing login
    if (user.isApproved === false) {
      return NextResponse.json(
        { error: "Account awaiting admin approval" },
        { status: 403 },
      );
    }
    if (user.isBanned) {
      return NextResponse.json(
        { error: "Account has been banned. Please contact support." },
        { status: 403 },
      );
    }

    const isPasswordValid = await passwordService.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const tokenPair = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Update last login via Supabase REST
    await supabaseAdmin!
      .from("User")
      .update({
        lastLogin: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1,
      })
      .eq("id", user.id);

    // Reset rate-limit counters on successful login
    await Promise.allSettled([resetRateLimit(ipKey), resetRateLimit(emailKey)]);

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
        tokens: tokenPair,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `refreshToken=${tokenPair.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`,
        },
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
