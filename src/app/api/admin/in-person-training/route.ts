import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";

function buildCouponCode() {
  return `IT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const db = getSupabaseAdmin();
    const { data: registrations, error } = await db
      .from("InPersonTrainingRegistration")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ADMIN IN-PERSON] Load failed", error);
      return NextResponse.json(
        { success: false, error: "Failed to load registrations" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: registrations || [] });
  } catch (error) {
    console.error("[ADMIN IN-PERSON] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load registrations" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireRole(request, ["admin"]);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { registrationId, action } = body || {};

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: "Registration ID is required" },
        { status: 400 },
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();
    const updatePayload = {
      registration_status: action === "approve" ? "approved" : "rejected",
      payment_status: action === "approve" ? "approved" : "rejected",
      updated_at: new Date().toISOString(),
      coupon_code: action === "approve" ? buildCouponCode() : null,
    };

    const { data: registration, error } = await db
      .from("InPersonTrainingRegistration")
      .update(updatePayload)
      .eq("id", registrationId)
      .select()
      .single();

    if (error || !registration) {
      console.error("[ADMIN IN-PERSON] Update failed", error);
      return NextResponse.json(
        { success: false, error: "Failed to update registration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: registration });
  } catch (error) {
    console.error("[ADMIN IN-PERSON] PATCH error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update registration" },
      { status: 500 },
    );
  }
}
