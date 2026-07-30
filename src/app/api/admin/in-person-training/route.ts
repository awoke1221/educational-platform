import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { verifyAuth, requireRole } from "@/lib/auth/middleware";

function buildCouponCode() {
  return `IT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeEmail(value?: string | null) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  return text || null;
}

function makeTimestampSuffix() {
  return Date.now().toString(36).slice(-6);
}

function createUsernameFromRegistration(registration: Record<string, any>) {
  const base = [
    registration?.full_name,
    registration?.email,
    registration?.phone_number?.replace(/\D/g, ""),
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);

  const suffix = makeTimestampSuffix();
  return `${base || "ip"}${suffix}`;
}

async function ensureUserRecord(
  db: any,
  registration: Record<string, any>,
  action: "approve" | "reject",
) {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(registration?.email);
  const normalizedPhone =
    String(registration?.phone_number || "").trim() || null;
  const fullName = String(
    registration?.full_name || "Training participant",
  ).trim();

  let targetUserId = registration?.user_id || null;
  let existingUser: Record<string, any> | null = null;

  // First check if a User record already exists by email or phone
  if (!targetUserId && normalizedEmail) {
    const { data: byEmail } = await db
      .from("User")
      .select("id, username")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (byEmail?.id) {
      targetUserId = byEmail.id;
      existingUser = byEmail;
    }
  }

  if (!targetUserId && normalizedPhone) {
    const { data: byPhone } = await db
      .from("User")
      .select("id, username")
      .eq("phoneNumber", normalizedPhone)
      .maybeSingle();
    if (byPhone?.id) {
      targetUserId = byPhone.id;
      existingUser = byPhone;
    }
  }

  if (existingUser && targetUserId) {
    // Update the existing user record
    const updateFields: Record<string, any> = {
      isActive: action === "approve",
      isApproved: action === "approve",
      fullName,
      updatedAt: now,
    };
    if (normalizedPhone) updateFields.phoneNumber = normalizedPhone;
    if (action === "reject") updateFields.deletedAt = now;
    else updateFields.deletedAt = null;

    const { error: updateError } = await db
      .from("User")
      .update(updateFields)
      .eq("id", targetUserId);

    if (updateError) {
      console.error(
        "[ADMIN IN-PERSON] Failed to update existing user",
        updateError,
      );
      throw updateError;
    }
  } else {
    // Create a brand new user record
    if (!targetUserId) {
      targetUserId = crypto.randomUUID();
    }

    const username = createUsernameFromRegistration(registration);
    const payload: Record<string, any> = {
      id: targetUserId,
      username,
      email: normalizedEmail || `${username}@inperson.local`,
      fullName,
      phoneNumber: normalizedPhone,
      passwordHash: "",
      role: "user",
      isActive: action === "approve",
      isApproved: action === "approve",
      isBanned: false,
      paymentStatus: "none",
      loginCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (action === "reject") payload.deletedAt = now;

    const { error: insertError } = await db.from("User").insert(payload);

    if (insertError) {
      console.error("[ADMIN IN-PERSON] Failed to insert new user", insertError);
      throw insertError;
    }
  }

  return targetUserId;
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

    const supabaseAdminClient = getSupabaseAdmin();
    const { data: registrations, error } = await supabaseAdminClient
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

    const pendingRegistrations = (registrations || []).filter(
      (item: Record<string, any>) => {
        const status = String(item?.registration_status || "").toLowerCase();
        return !["approved", "rejected"].includes(status);
      },
    );

    return NextResponse.json({ success: true, data: pendingRegistrations });
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
    const { registrationId } = body || {};
    const rawAction = String(body?.action || "").toLowerCase();

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: "Registration ID is required" },
        { status: 400 },
      );
    }

    if (rawAction !== "approve" && rawAction !== "reject") {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }
    const action: "approve" | "reject" = rawAction;

    const supabaseAdminClient = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: currentRegistration, error: loadError } =
      await supabaseAdminClient
        .from("InPersonTrainingRegistration")
        .select("*")
        .eq("id", registrationId)
        .single();

    if (loadError || !currentRegistration) {
      console.error("[ADMIN IN-PERSON] Lookup failed", loadError);
      return NextResponse.json(
        { success: false, error: "Failed to load registration" },
        { status: 500 },
      );
    }

    const targetUserId = await ensureUserRecord(
      supabaseAdminClient,
      currentRegistration,
      action,
    );

    const updatePayload = {
      registration_status: action === "approve" ? "approved" : "rejected",
      payment_status: action === "approve" ? "approved" : "rejected",
      user_id: targetUserId,
      updated_at: now,
      coupon_code: action === "approve" ? buildCouponCode() : null,
    };

    const { data: registration, error } = await supabaseAdminClient
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
