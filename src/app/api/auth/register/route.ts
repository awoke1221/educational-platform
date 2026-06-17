// src/app/api/auth/register/route.ts
// User Registration API Endpoint - Supabase REST API (IPv4 Compatible)

import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabase";
import { jwtService } from "@/lib/auth/jwt";
import { passwordService } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
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

    // ============================================
    // STEP 2: Check Password Strength
    // ============================================
    const passwordStrength = passwordService.validatePasswordStrength(password);

    if (!passwordStrength.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet security requirements",
          issues: passwordStrength.errors,
          suggestions: passwordStrength.suggestions,
        },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured. Check environment variables." },
        { status: 500 },
      );
    }

    // ============================================
    // STEP 3: Check for Existing User
    // ============================================
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from("User")
      .select("id, email, username")
      .or(`email.eq.${email.toLowerCase()},username.eq.${username}`)
      .maybeSingle();

    if (findError) {
      console.error("[REGISTER FIND ERROR]", findError);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 },
      );
    }

    if (existingUser) {
      const conflictField =
        existingUser.email === email.toLowerCase() ? "email" : "username";
      return NextResponse.json(
        {
          error: `This ${conflictField} is already registered`,
          field: conflictField,
        },
        { status: 409 },
      );
    }

    // ============================================
    // STEP 4: Hash Password with bcrypt
    // ============================================
    const passwordHash = await passwordService.hashPassword(password);

    // ============================================
    // STEP 5: Create User in Database
    // ============================================
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("User")
      .insert({
        id: crypto.randomUUID(),
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        fullName,
        phoneNumber: phoneNumber || "",
        passwordHash,
        role: "user",
        isActive: true,
        loginCount: 0,
        updatedAt: new Date().toISOString(),
      })
      .select("id, username, email, fullName, role, createdAt")
      .single();

    if (createError) {
      console.error("[REGISTER CREATE ERROR]", createError);

      // Handle unique constraint violation
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "Email or username already in use" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 },
      );
    }

    // ============================================
    // STEP 6: Generate JWT Token Pair
    // ============================================
    const tokenPair = jwtService.generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // ============================================
    // STEP 7: Create Initial Device Session
    // ============================================
    const deviceInfo = getDeviceInfo(request);

    const { error: deviceError } = await supabaseAdmin
      .from("DeviceSession")
      .insert({
        id: crypto.randomUUID(),
        userId: newUser.id,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        isActive: true,
        loginAt: new Date().toISOString(),
      });

    if (deviceError) {
      console.warn("[REGISTER DEVICE ERROR]", deviceError);
      // Non-critical - continue even if device session fails
    }

    // ============================================
    // STEP 8: Log User Activity (Audit Trail)
    // ============================================
    console.log(
      `[AUDIT] New user registered: ${newUser.id} (${newUser.email})`,
    );

    // ============================================
    // STEP 9: Return Success Response
    // ============================================
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: newUser,
        tokens: tokenPair,
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": `refreshToken=${tokenPair.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`,
        },
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

  const crypto = require("crypto");
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
