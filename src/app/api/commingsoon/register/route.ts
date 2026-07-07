// src/app/api/commingsoon/register/route.ts
// POST — Save coming soon signup data
// COMPLETELY SEPARATE from auth/login/register system
//
// 🚀 OPTIMIZED for concurrent users:
//   - Uses a pre-compiled Postgres stored procedure (single round trip)
//   - Built-in ON CONFLICT duplicate detection at the DB level
//   - Rate limited via the in-memory/Redis rate limiter
//   - Request body size limited to prevent resource exhaustion

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimiter";

// ── Constants ────────────────────────────────────────────

/** Maximum request body size (5 KB) — prevents resource exhaustion */
const MAX_BODY_SIZE = 5_000;

// ─── POST Handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Rate limiting ───────────────────────────────
    // Uses the existing rateLimiter (Redis-backed with in-memory fallback)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await rateLimit(`commingsoon:${ip}`, {
      limit: 10, // max 10 submissions per IP
      windowMs: 900_000, // per 15-minute window
    });

    if (!rateLimitResult.success) {
      const retryAfter = Math.max(
        1,
        rateLimitResult.reset - Math.floor(Date.now() / 1000),
      );
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          },
        },
      );
    }

    // ── 2. Body size check ─────────────────────────────
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413 },
      );
    }

    // ── 3. Parse body ──────────────────────────────────
    const body = await request.json();
    const {
      fullName,
      email,
      phoneNumber,
      gender,
      country,
      locationType,
      attendanceMode,
      diasporaCoachingMode,
      tiktokUsername,
      tiktokPurpose,
      source,
    } = body;

    // ── 4. Basic validation ────────────────────────────
    if (!fullName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required" },
        { status: 400 },
      );
    }

    if (!gender?.trim()) {
      return NextResponse.json(
        { success: false, error: "Gender is required" },
        { status: 400 },
      );
    }

    if (!["local", "diaspora"].includes(locationType)) {
      return NextResponse.json(
        { success: false, error: "Invalid location type" },
        { status: 400 },
      );
    }

    if (locationType === "diaspora" && !email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required for diaspora registration",
        },
        { status: 400 },
      );
    }

    if (
      locationType === "local" &&
      !["in-person", "online"].includes(attendanceMode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Attendance mode is required for local registration",
        },
        { status: 400 },
      );
    }

    if (locationType === "local" && !phoneNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is required for local registration",
        },
        { status: 400 },
      );
    }

    if (
      locationType === "diaspora" &&
      diasporaCoachingMode === "one-on-one" &&
      (!phoneNumber?.trim() || !tiktokUsername?.trim() || !tiktokPurpose)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One-on-one diaspora registrations need phone number, TikTok username, and purpose",
        },
        { status: 400 },
      );
    }

    // ── 5. Build diaspora metadata (stored in source field until migration is applied) ──
    const effectiveSource =
      locationType === "diaspora" && diasporaCoachingMode
        ? JSON.stringify({
            diasporaCoachingMode,
            tiktokUsername: tiktokUsername?.trim() || null,
            tiktokPurpose: tiktokPurpose || null,
            source: source || "homepage",
          })
        : source || "homepage";

    // ── 6. Insert via stored procedure with direct fallback ─────
    const supabase = getSupabaseAdmin();

    // Try the stored procedure first (only with supported parameters)
    const rpcPayload: Record<string, any> = {
      p_fullname: fullName.trim(),
      p_email: email?.trim()?.toLowerCase() || null,
      p_phonenumber: phoneNumber?.trim() || null,
      p_gender: gender,
      p_country: country?.trim() || null,
      p_locationtype: locationType,
      p_attendancemode: attendanceMode || null,
      p_source: effectiveSource,
    };

    const { data, error } = await supabase.rpc(
      "fast_register_commingsoon",
      rpcPayload,
    );

    if (error) {
      console.warn(
        "[COMMINGSOON] RPC failed, falling back to direct insert:",
        error,
      );

      const { data: insertData, error: insertError } = await supabase
        .from("commingsoon_users")
        .insert({
          fullName: fullName.trim(),
          email: email?.trim()?.toLowerCase() || null,
          phoneNumber: phoneNumber?.trim() || null,
          gender,
          country: country?.trim() || null,
          locationType,
          attendanceMode: attendanceMode || null,
          source: effectiveSource,
        })
        .select("id")
        .single();

      if (insertError || !insertData?.id) {
        console.error("[COMMINGSOON] Direct insert error:", insertError);
        return NextResponse.json(
          { success: false, error: "Registration failed. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          id: insertData.id,
          message:
            "Thank you for registering! We'll notify you when the course launches.",
        },
        { status: 201 },
      );
    }

    // The stored procedure returns a TABLE(success, id, error_msg)
    // Supabase RPC returns this as an array of rows
    const rows = data as Array<{
      success: boolean;
      id: string | null;
      error_msg: string | null;
    }>;

    const result = rows?.[0];

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error_msg || "Registration failed",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        message:
          "Thank you for registering! We'll notify you when the course launches.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[COMMINGSOON] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
