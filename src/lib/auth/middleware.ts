// src/lib/auth/middleware.ts
// Advanced Authentication Middleware

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { jwtService, JWTPayload } from "./jwt";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

/**
 * Verify JWT token from Authorization header
 */
export async function verifyAuth(
  request: NextRequest,
): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    return jwtService.verifyAccessToken(token);
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export async function hasRole(
  auth: JWTPayload | null,
  requiredRoles: string[],
): Promise<boolean> {
  if (!auth) return false;
  return requiredRoles.includes(auth.role);
}

/**
 * Verify user exists and is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/lib/db/supabaseAdmin");
    if (!supabaseAdmin) return true; // Default allow if no DB

    const { data, error } = await supabaseAdmin!
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
 * Verify device session is valid
 */
export async function verifyDeviceSession(
  userId: string,
  deviceId: string,
): Promise<boolean> {
  try {
    if (!supabaseAdmin) return false;

    const { data, error } = await supabaseAdmin!
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
 * Check enrollment access
 */
export async function checkEnrollmentAccess(
  userId: string,
  courseId: string,
): Promise<boolean> {
  try {
    if (!supabaseAdmin) return false;

    const { data: enrollment, error } = await supabaseAdmin!
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
 * Get device info from request
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
 * Middleware to require authentication
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
 * Middleware to require specific role
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
