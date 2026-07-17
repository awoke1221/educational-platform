import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { StorageService } from "@/lib/storage/supabase";

function buildCouponCode() {
  return `IT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizePaymentMethod(value?: string) {
  if (!value) return "telebirr";
  const normalized = value.toLowerCase();
  if (normalized === "cbbirr" || normalized === "cb_birr") return "cb_birr";
  if (normalized === "telebirr") return "telebirr";
  return "telebirr";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const db = getSupabaseAdmin();

    const { data: setting, error: settingError } = await db
      .from("InPersonTrainingSetting")
      .select("*")
      .eq("course_id", courseId)
      .maybeSingle();

    if (settingError) {
      console.error(
        "[IN-PERSON] Failed to load training setting",
        settingError,
      );
      return NextResponse.json(
        { success: false, error: "Unable to load in-person training capacity" },
        { status: 500 },
      );
    }

    const { data: course } = await db
      .from("Course")
      .select("id, title")
      .eq("id", courseId)
      .maybeSingle();

    const capacity = setting?.capacity ?? 1000;
    const registeredCount = setting?.registered_count ?? 0;
    const remainingSpots = Math.max(0, capacity - registeredCount);

    return NextResponse.json({
      success: true,
      data: {
        courseId,
        courseTitle: course?.title || "Course",
        capacity,
        registeredCount,
        remainingSpots,
        isActive: setting?.is_active ?? true,
        paymentCurrency: setting?.payment_currency || "ETB",
        paymentInstructions:
          setting?.payment_instructions ||
          "Pay by Telebirr or CBE Birr, then upload your receipt.",
      },
    });
  } catch (error) {
    console.error("[IN-PERSON] GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load in-person training details" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    const {
      fullName,
      phoneNumber,
      email,
      paymentMethod,
      paymentReceiptBase64,
      paymentReceiptFilename,
      notes,
      userId,
    } = body || {};

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

    const { data: existingSetting, error: settingError } = await db
      .from("InPersonTrainingSetting")
      .select("*")
      .eq("course_id", courseId)
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
        { success: false, error: "This in-person training cohort is full" },
        { status: 409 },
      );
    }

    const normalizedPhone = String(phoneNumber).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    const { data: duplicateRegistration } = await db
      .from("InPersonTrainingRegistration")
      .select("id")
      .eq("course_id", courseId)
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
      "image/png",
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
      course_id: courseId,
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
        {
          success: false,
          error: "Failed to save your in-person training registration",
        },
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
        course_id: courseId,
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
        couponCode: null,
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
