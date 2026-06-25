// src/app/api/auth/register/route.ts
// User Registration — Supabase Auth + custom profile columns
//
// Flow:
//   1. Validate input & rate limit
//   2. Create the user in Supabase Auth via supabase.auth.signUp()
//   3. Write custom profile columns to the User table (admin client,
//      since RLS policies aren't active for newly created profiles yet)
//   4. Insert a UserRegistration record
//   5. Return the Supabase session so the client can use it immediately

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { registerSchema } from "@/lib/validators/schemas";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";
import { rateLimit } from "@/lib/rateLimiter";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ipKey = `register:ip:${ip}`;

    const ipLimit = await rateLimit(ipKey, {
      limit: env.rateLimit.register.ipMaxAttempts,
      windowMs: env.rateLimit.register.windowMs,
    });

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please try again later.",
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

    // ============================================
    // STEP 1: Validate Input with Zod
    // ============================================
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { username, email, fullName, phoneNumber, password } =
      validation.data;

    const normalizedPhone = phoneNumber.trim();
    const sanitizedBaseUsername = (username?.trim().toLowerCase() || "")
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 50);
    const generatedUsername =
      sanitizedBaseUsername || `user${normalizedPhone.replace(/\D/g, "")}`;
    const finalUsername = generatedUsername || `user${Date.now()}`;
    const finalEmail = (
      email?.trim().toLowerCase() || `${finalUsername}@phone.local`
    ).slice(0, 255);
    const finalFullName = fullName?.trim() || normalizedPhone;

    // ── Rate limit by email ────────────────────────────────────────
    const emailKey = `register:email:${finalEmail}`;

    const emailLimit = await rateLimit(emailKey, {
      limit: env.rateLimit.register.emailMaxAttempts,
      windowMs: env.rateLimit.register.windowMs,
    });

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many registration attempts for this email. Please try again later.",
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
    // STEP 2: Create Supabase Auth user
    // ============================================
    // Use the anon key (public) client — NOT the service-role client — so
    // the call respects Supabase's built-in auth configuration (e.g.,
    // email confirmation, rate limiting).
    const supabase = getSupabaseAnon();

    const { data: authData, error: signUpError } = await supabase.auth.signUp(
      password
        ? {
            email: finalEmail,
            password,
            options: {
              data: {
                full_name: finalFullName,
                phone: normalizedPhone,
              },
            },
          }
        : {
            email: finalEmail,
            // Minimal placeholder — the user will set a real password later
            password: crypto.randomUUID() + "Aa1!",
            options: {
              data: {
                full_name: finalFullName,
                phone: normalizedPhone,
              },
            },
          },
    );

    if (signUpError) {
      console.error("[REGISTER SUPABASE SIGNUP ERROR]", signUpError);

      if (signUpError.message?.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Registration failed. Please try again later." },
        { status: 500 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Registration failed. No user returned." },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    // ============================================
    // STEP 3: Write custom profile columns
    // ============================================
    const supabaseAdmin = getSupabaseAdmin();

    const { data: newUser, error: profileError } = await supabaseAdmin!
      .from("User")
      .upsert(
        {
          id: authData.user.id,
          username: finalUsername.toLowerCase(),
          email: finalEmail,
          fullName: finalFullName,
          phoneNumber: normalizedPhone,
          role: "user",
          isActive: true,
          loginCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        { onConflict: "id" },
      )
      .select("id, username, email, fullName, role, createdAt")
      .single();

    if (profileError) {
      console.error("[REGISTER PROFILE INSERT ERROR]", profileError);
      // Non-fatal — the auth user exists, the profile can be retried later
    }

    // ============================================
    // STEP 4: Insert registration record
    // ============================================
    const { error: regInsertError } = await supabaseAdmin!
      .from("UserRegistration")
      .insert({
        id: crypto.randomUUID(),
        userId: authData.user.id,
        isApproved: false,
        paymentStatus: "pending",
      })
      .select("id")
      .maybeSingle();

    if (regInsertError) {
      console.error("[REGISTER REGISTRATION INSERT ERROR]", regInsertError);
      // Non-fatal — the auth user + profile exist, registration can be
      // retried. The login approval check handles the missing record
      // gracefully (skips the isApproved guard).
    }

    console.log(
      `[AUDIT] New registration: ${authData.user.id} (${finalEmail})`,
    );

    // ============================================
    // STEP 5: Return the Supabase session
    // ============================================
    const session = authData.session
      ? {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_in: authData.session.expires_in,
          expires_at: authData.session.expires_at,
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        message:
          "Pre-registration created. Please complete payment to submit for review.",
        session,
        user: newUser || {
          id: authData.user.id,
          email: finalEmail,
          username: finalUsername,
        },
      },
      {
        status: 201,
        headers: session
          ? {
              "Set-Cookie": `sb-access-token=${session.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${session.expires_in}`,
            }
          : undefined,
      },
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }
}

// ============================================
// Helper: Extract Device Information from Request
// ============================================
function getDeviceInfo(request: NextRequest): {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
} {
  const userAgent = request.headers.get("User-Agent") || "Unknown";
  const ipAddress =
    request.headers.get("X-Forwarded-For") ||
    request.headers.get("X-Client-IP") ||
    "Unknown";

  let deviceType = "desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "tablet";
  }

  const deviceId = crypto
    .createHash("sha256")
    .update(userAgent + ipAddress)
    .digest("hex");

  let deviceName = "Unknown Device";
  if (/iPhone/i.test(userAgent)) deviceName = "iPhone";
  else if (/iPad/i.test(userAgent)) deviceName = "iPad";
  else if (/Android/i.test(userAgent)) deviceName = "Android Device";
  else if (/Windows/i.test(userAgent)) deviceName = "Windows PC";
  else if (/Mac/i.test(userAgent)) deviceName = "Mac";
  else if (/Linux/i.test(userAgent)) deviceName = "Linux Device";

  return {
    deviceId,
    deviceName,
    deviceType,
    userAgent,
    ipAddress,
  };
}
