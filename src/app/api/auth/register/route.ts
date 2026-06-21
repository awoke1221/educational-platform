// src/app/api/auth/register/route.ts
// User Registration API Endpoint - Supabase REST API (IPv4 Compatible)

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { registerSchema } from "@/lib/validators/schemas";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured. Check environment variables." },
        { status: 500 },
      );
    }

    // ============================================
    // STEP 3: Check for Existing User
    // ============================================
    const { data: existingUser, error: findError } = await supabaseAdmin!
      .from("User")
      .select("id, email, username, phoneNumber")
      .or(
        `email.eq.${finalEmail},username.eq.${finalUsername},phoneNumber.eq.${normalizedPhone}`,
      )
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
        existingUser.phoneNumber === normalizedPhone
          ? "phoneNumber"
          : existingUser.email === finalEmail
            ? "email"
            : "username";
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
    const passwordHash = password
      ? await passwordService.hashPassword(password)
      : "";

    // ============================================
    // STEP 5: Create User in Database
    // ============================================
    const { data: newUser, error: createError } = await supabaseAdmin!
      .from("User")
      .insert({
        id: crypto.randomUUID(),
        username: finalUsername.toLowerCase(),
        email: finalEmail,
        fullName: finalFullName,
        phoneNumber: normalizedPhone,
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
    // STEP 6: Mark as awaiting admin approval and respond
    // - Do NOT issue tokens or create a session until admin approves
    // - This keeps the existing auth flow intact while enforcing approval
    // ============================================

    // update created user to explicitly set isApproved = false and initial payment status
    await supabaseAdmin!
      .from("User")
      .update({ isApproved: false, paymentStatus: "pending" })
      .eq("id", newUser.id);

    console.log(
      `[AUDIT] New pre-registration: ${newUser.id} (${newUser.email})`,
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Pre-registration created. Please complete payment to submit for review.",
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
        },
      },
      { status: 201 },
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

