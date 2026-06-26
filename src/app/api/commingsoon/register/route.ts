// src/app/api/commingsoon/register/route.ts
// POST — Save coming soon signup data
// COMPLETELY SEPARATE from auth/login/register system

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phoneNumber, gender, locationType, source } = body;

    // ── Validation ───────────────────────────────
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

    if (locationType === "diaspora" && !email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required for diaspora registration",
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

    if (!["local", "diaspora"].includes(locationType)) {
      return NextResponse.json(
        { success: false, error: "Invalid location type" },
        { status: 400 },
      );
    }

    // ── Insert into commingsoon_users ────────────
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("commingsoon_users")
      .insert({
        fullName: fullName.trim(),
        email: email?.trim()?.toLowerCase() || null,
        phoneNumber: phoneNumber?.trim() || null,
        gender,
        locationType,
        source: source || "homepage",
      })
      .select("id")
      .single();

    if (error) {
      // Handle duplicate email/phone gracefully
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error:
              "You've already registered! We'll notify you when the course launches.",
          },
          { status: 409 },
        );
      }
      console.error("[COMMINGSOON] Insert error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save registration. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message:
        "Thank you for registering! We'll notify you when the course launches.",
    });
  } catch (err: any) {
    console.error("[COMMINGSOON] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
