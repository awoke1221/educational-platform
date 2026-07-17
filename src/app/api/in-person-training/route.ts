import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { verifyAuth } from "@/lib/auth/middleware";
import { StorageService } from "@/lib/storage/supabase";

function normalizePaymentMethod(value?: string) {
  if (!value) return "telebirr";
  const normalized = value.toLowerCase();
  if (normalized === "cbbirr" || normalized === "cb_birr") return "cb_birr";
  if (normalized === "telebirr") return "telebirr";
  return "telebirr";
}

function inferReceiptContentType(base64: string, filename: string) {
  const cleaned = String(base64 || "").trim();
  const dataMatch = cleaned.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
  if (dataMatch?.[1]) {
    return dataMatch[1];
  }

  const extension = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "image/png";
}

export async function GET(request: NextRequest) {
  try {
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
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[IN-PERSON USER] Load failed", error);
      return NextResponse.json(
        { success: false, error: "Failed to load in-person registrations" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: registrations || [] });
  } catch (error) {
    console.error("[IN-PERSON USER] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load in-person registrations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseId,
      fullName,
      phoneNumber,
      email,
      paymentMethod,
      paymentReceiptBase64,
      paymentReceiptFilename,
      notes,
      userId,
    } = body || {};

    if (!courseId || !String(courseId).trim()) {
      return NextResponse.json(
        { success: false, error: "Please select a training program" },
        { status: 400 },
      );
    }

    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required" },
        { status: 400 },
      );
    }

    if (!phoneNumber || !String(phoneNumber).trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!paymentReceiptBase64 || !paymentReceiptFilename) {
      return NextResponse.json(
        { success: false, error: "Please upload a payment receipt" },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();
    const normalizedCourseId = String(courseId).trim();
    const normalizedPhone = String(phoneNumber).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    const { data: existingSetting, error: settingError } = await db
      .from("InPersonTrainingSetting")
      .select("*")
      .eq("course_id", normalizedCourseId)
      .maybeSingle();

    if (settingError) {
      console.error("[IN-PERSON] Setting lookup failed", settingError);
      return NextResponse.json(
        { success: false, error: "Unable to access training capacity" },
        { status: 500 },
      );
    }

    const capacity = existingSetting?.capacity ?? 1000;
    const registeredCount = existingSetting?.registered_count ?? 0;
    const remainingSpots = Math.max(0, capacity - registeredCount);

    if (remainingSpots <= 0) {
      return NextResponse.json(
        { success: false, error: "This training cohort is full" },
        { status: 409 },
      );
    }

    const { data: duplicateRegistration } = await db
      .from("InPersonTrainingRegistration")
      .select("id")
      .eq("course_id", normalizedCourseId)
      .eq("phone_number", normalizedPhone)
      .maybeSingle();

    if (duplicateRegistration) {
      return NextResponse.json(
        {
          success: false,
          error: "This phone number is already registered for this training",
        },
        { status: 409 },
      );
    }

    const uploadResult = await StorageService.uploadReceipt(
      userId || crypto.randomUUID(),
      String(paymentReceiptBase64),
      String(paymentReceiptFilename),
      inferReceiptContentType(
        String(paymentReceiptBase64),
        String(paymentReceiptFilename),
      ),
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || "Receipt upload failed",
        },
        { status: 500 },
      );
    }

    const registrationPayload = {
      id: crypto.randomUUID(),
      course_id: normalizedCourseId,
      user_id: userId || null,
      full_name: String(fullName).trim(),
      phone_number: normalizedPhone,
      email: normalizedEmail,
      payment_method: normalizePaymentMethod(paymentMethod),
      payment_receipt_url: uploadResult.publicUrl,
      payment_receipt_filename: String(paymentReceiptFilename).trim(),
      payment_status: "pending",
      registration_status: "registered",
      notes: notes ? String(notes).trim() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedRegistration, error: insertError } = await db
      .from("InPersonTrainingRegistration")
      .insert(registrationPayload)
      .select()
      .single();

    if (insertError || !insertedRegistration) {
      console.error("[IN-PERSON] Registration insert failed", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save your registration" },
        { status: 500 },
      );
    }

    if (existingSetting?.id) {
      const nextCount = (existingSetting.registered_count ?? 0) + 1;
      await db
        .from("InPersonTrainingSetting")
        .update({
          registered_count: nextCount,
          remaining_spots: Math.max(
            0,
            (existingSetting.capacity ?? 1000) - nextCount,
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSetting.id);
    } else {
      await db.from("InPersonTrainingSetting").insert({
        id: crypto.randomUUID(),
        course_id: normalizedCourseId,
        capacity: 1000,
        registered_count: 1,
        remaining_spots: 999,
        is_active: true,
        payment_currency: "ETB",
        payment_instructions:
          "Pay using Telebirr or CBE Birr, then upload your receipt.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        registrationId: insertedRegistration.id,
        remainingSpots: Math.max(0, capacity - (registeredCount + 1)),
        message:
          "Your registration was received and is pending admin approval.",
      },
    });
  } catch (error) {
    console.error("[IN-PERSON] POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit in-person training registration",
      },
      { status: 500 },
    );
  }
}
