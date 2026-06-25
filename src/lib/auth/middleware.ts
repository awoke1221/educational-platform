// src/lib/auth/middleware.ts
// Authentication Middleware — Supabase Auth
//
// All functions now validate the Supabase access token (from the
// Authorization header) instead of a custom JWT. The token is
// verified via supabase.auth.getUser() which calls the Supabase
// Auth API.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { env } from "@/config/env";

// ── Auth user shape (compatible with the old JWTPayload) ──────────────

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// ── Internal: anon-key client used for token verification ─────────────

function createAuthClient() {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ── Public helpers ────────────────────────────────────────────────────

/**
 * Verify a Supabase access token from the Authorization header.
 *
 * Uses supabase.auth.getUser() which validates the JWT against the
 * Supabase Auth API.  On success it returns { userId, email, role }
 * where the role is looked up from the User table (cached lightweight).
 *
 * Returns null when the token is missing, expired, or invalid.
 */
export async function verifyAuth(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);

    // ── Verify the token via Supabase Auth API ─────────────────
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    const authUser = data.user;

    // ── Look up role from the User table ──────────────────────
    // This is a quick read — the numeric id primary key makes it fast.
    // Once RLS is active (Phase 4), this lookup could be cached or the
    // role could be embedded in user_metadata during sign-up.
    let role = "user";
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin!
        .from("User")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profile?.role) role = profile.role;
    } catch {
      // Default to "user" on error
    }

    return {
      userId: authUser.id,
      email: authUser.email ?? "",
      role,
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

/**
 * Check if the authenticated user has one of the required roles.
 */
export async function hasRole(
  auth: AuthUser | null,
  requiredRoles: string[],
): Promise<boolean> {
  if (!auth) return false;
  return requiredRoles.includes(auth.role);
}

/**
 * Verify user exists and is active.
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin!
      .from("User")
      .select("isActive, isBanned")
      .eq("id", userId)
      .single();

    if (error || !data) return true; // Default allow on error
    return data.isActive === true && data.isBanned !== true;
  } catch (error) {
    console.error("Error checking user status:", error);
    return true; // Default allow to prevent lockouts
  }
}

/**
 * Verify device session is valid.
 */
export async function verifyDeviceSession(
  userId: string,
  deviceId: string,
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin!
      .from("DeviceSession")
      .select("isActive")
      .eq("userId", userId)
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (error || !data) return false;
    return data.isActive === true;
  } catch (error) {
    console.error("Error verifying device session:", error);
    return false;
  }
}

/**
 * Check enrollment access.
 */
export async function checkEnrollmentAccess(
  userId: string,
  courseId: string,
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();

    const { data: enrollment, error } = await admin!
      .from("Enrollment")
      .select("status, payment:Payment(status)")
      .eq("userId", userId)
      .eq("courseId", courseId)
      .maybeSingle();

    if (error || !enrollment) return false;

    // Type guard: payment could be array (Supabase nested select returns array)
    const payment = Array.isArray(enrollment.payment)
      ? enrollment.payment[0]
      : enrollment.payment;

    return (
      enrollment.status === "active" &&
      (!payment || payment.status === "approved")
    );
  } catch (error) {
    console.error("Error checking enrollment:", error);
    return false;
  }
}

/**
 * Get device info from request.
 */
export function getDeviceInfo(request: NextRequest): {
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

  // Simple device detection from User-Agent
  let deviceType = "desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // Generate device ID from User-Agent hash
  const deviceId = crypto
    .createHash("sha256")
    .update(userAgent + ipAddress)
    .digest("hex");

  // Extract device name
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

/**
 * Middleware: require a valid authenticated session.
 * Returns a 401 / 403 NextResponse on failure, or null to continue.
 */
export async function requireAuth(
  request: NextRequest,
): Promise<NextResponse | null> {
  const auth = await verifyAuth(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized - Invalid or missing token" },
      { status: 401 },
    );
  }

  const isActive = await isUserActive(auth.userId);
  if (!isActive) {
    return NextResponse.json(
      { error: "Unauthorized - User account is inactive" },
      { status: 403 },
    );
  }

  return null; // Continue to handler
}

/**
 * Middleware: require a valid session AND one of the listed roles.
 */
export async function requireRole(
  request: NextRequest,
  requiredRoles: string[],
): Promise<NextResponse | null> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasRequiredRole = await hasRole(auth, requiredRoles);
  if (!hasRequiredRole) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 },
    );
  }

  return null; // Continue to handler
}

/**
 * Middleware to check course enrollment
 */
export async function requireCourseAccess(
  request: NextRequest,
  courseId: string,
): Promise<NextResponse | null> {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkEnrollmentAccess(auth.userId, courseId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden - No access to this course" },
      { status: 403 },
    );
  }

  return null; // Continue to handler
}
