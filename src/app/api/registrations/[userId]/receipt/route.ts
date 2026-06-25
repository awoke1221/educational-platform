import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { StorageService } from "@/lib/storage/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const {
      paymentMethod,
      paymentChannel,
      filename,
      fileBase64,
      courseId,
      transactionId,
      fullName,
      phoneNumber,
    } = body;

    // ── Validate required fields ──
    if (!userId || !fileBase64 || !filename) {
      return NextResponse.json(
        { error: "Missing required fields: userId, filename, fileBase64" },
        { status: 400 },
      );
    }

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !phoneNumber.trim()
    ) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // ── Validate file size (base64 length ~ 4/3 of binary size) ──
    const estimatedBytes = Math.ceil((fileBase64.length * 3) / 4);
    if (estimatedBytes > StorageService.maxFileSize) {
      return NextResponse.json(
        {
          error: `File too large (${(estimatedBytes / 1024 / 1024).toFixed(1)}MB). Maximum: ${StorageService.maxFileSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // ── Detect MIME type from base64 prefix or filename extension ──
    let mimeType = "image/png"; // default
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (filename.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filename.endsWith(".webp")) {
      mimeType = "image/webp";
    } else if (filename.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    // ── Upload to Supabase Storage ──
    const uploadResult = await StorageService.uploadReceipt(
      userId,
      fileBase64,
      filename,
      mimeType,
    );

    if (!uploadResult.success) {
      console.error("[RECEIPT] Storage upload failed:", uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload receipt image" },
        { status: 500 },
      );
    }

    // ── Persist receipt info on the UserRegistration record ──
    const { data: existingReg } = await supabaseAdmin!
      .from("UserRegistration")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();

    if (existingReg) {
      await supabaseAdmin!
        .from("UserRegistration")
        .update({
          pendingReceiptUrl: uploadResult.publicUrl,
          paymentMethod: paymentChannel || paymentMethod || "telebirr",
          paymentStatus: "pending",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existingReg.id);
    } else {
      await supabaseAdmin!.from("UserRegistration").insert({
        id: crypto.randomUUID(),
        userId,
        pendingReceiptUrl: uploadResult.publicUrl,
        paymentMethod: paymentChannel || paymentMethod || "telebirr",
        paymentStatus: "pending",
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Also update User name/phone
    const { error: updateError } = await supabaseAdmin!
      .from("User")
      .update({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[RECEIPT] DB update error:", updateError);

      // Rollback: delete the uploaded file if DB update fails
      await StorageService.deleteFile(uploadResult.storagePath).catch((e) =>
        console.error("[RECEIPT] Rollback delete failed:", e),
      );

      return NextResponse.json(
        { error: "Failed to save receipt info" },
        { status: 500 },
      );
    }

    // ── If a courseId was provided, create or update a pending Enrollment and Payment record ──
    let paymentRecord: any = null;
    if (courseId) {
      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("id, price, currency")
        .eq("id", courseId)
        .maybeSingle();

      if (!course) {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 },
        );
      }

      const { data: existingEnrollment, error: enrollErr } =
        await supabaseAdmin!
          .from("Enrollment")
          .select("*")
          .eq("userId", userId)
          .eq("courseId", courseId)
          .maybeSingle();

      if (enrollErr) {
        console.error("[RECEIPT] Enrollment lookup error:", enrollErr);
        return NextResponse.json(
          { error: "Failed to verify enrollment" },
          { status: 500 },
        );
      }

      let enrollment = existingEnrollment;
      if (existingEnrollment) {
        if (existingEnrollment.status === "active") {
          return NextResponse.json(
            {
              error:
                "You already have active access to this course. No receipt is required.",
            },
            { status: 409 },
          );
        }

        const { data: updatedEnrollment, error: updateEnrollErr } =
          await supabaseAdmin!
            .from("Enrollment")
            .update({
              status: "processing",
              updatedAt: new Date().toISOString(),
            })
            .eq("id", existingEnrollment.id)
            .select()
            .single();

        if (updateEnrollErr) {
          console.error("[RECEIPT] Enrollment update error:", updateEnrollErr);
          return NextResponse.json(
            { error: "Failed to update enrollment status" },
            { status: 500 },
          );
        }

        enrollment = updatedEnrollment;
      } else {
        const newEnrollmentId = crypto.randomUUID();
        const { data: newEnrollment, error: createEnrollErr } =
          await supabaseAdmin!
            .from("Enrollment")
            .insert({
              id: newEnrollmentId,
              userId,
              courseId,
              status: "processing",
              enrollmentDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (createEnrollErr) {
          console.error("[RECEIPT] Enrollment create error:", createEnrollErr);
          return NextResponse.json(
            { error: "Failed to create enrollment" },
            { status: 500 },
          );
        }

        enrollment = newEnrollment;
      }

      if (enrollment) {
        const { data: existingPayment } = await supabaseAdmin!
          .from("Payment")
          .select("*")
          .eq("enrollmentId", enrollment.id)
          .maybeSingle();

        // Map front-end payment channel values to database-allowed values.
        // Allowed: telebirr, cb_birr, bank_transfer, laki_pay
        const dbPaymentMethod = (paymentChannel || paymentMethod || "telebirr")
          .replace("paypal", "laki_pay")
          .replace("creditcard", "laki_pay");

        const paymentData = {
          enrollmentId: enrollment.id,
          userId,
          courseId,
          amount: course.price || 0,
          currency: course.currency || "ETB",
          paymentType: paymentMethod || "local",
          paymentMethod: dbPaymentMethod,
          status: "pending",
          transactionId: transactionId || null,
          receiptScreenshotUrl: uploadResult.publicUrl,
          receiptScreenshotKey: uploadResult.storagePath,
          payerName: fullName.trim(),
          payerPhone: phoneNumber.trim(),
          updatedAt: new Date().toISOString(),
        };

        if (existingPayment) {
          const { data: updatedPayment, error: updatePaymentErr } =
            await supabaseAdmin!
              .from("Payment")
              .update(paymentData)
              .eq("id", existingPayment.id)
              .select()
              .single();

          if (updatePaymentErr) {
            console.error("[RECEIPT] Payment update error:", updatePaymentErr);
            return NextResponse.json(
              { error: "Failed to update payment record" },
              { status: 500 },
            );
          }

          paymentRecord = updatedPayment;
        } else {
          const newPaymentId = crypto.randomUUID();
          // Try inserting with full paymentData first
          let newPayment = null;
          let createPaymentErr = null;

          try {
            const res = await supabaseAdmin!
              .from("Payment")
              .insert({ ...paymentData, id: newPaymentId })
              .select()
              .single();

            newPayment = res.data;
            createPaymentErr = res.error;
          } catch (e) {
            createPaymentErr = e as any;
          }

          if (createPaymentErr) {
            console.error("[RECEIPT] Payment create error:", createPaymentErr);

            // If schema cache is missing payerName/payerPhone (PGRST204), retry without those fields
            if (createPaymentErr.code === "PGRST204") {
              console.warn(
                "[RECEIPT] Schema cache missing payer fields; retrying without payerName/payerPhone",
              );
              const { payerName, payerPhone, ...paymentDataNoPayer } =
                paymentData as any;

              try {
                const retryRes = await supabaseAdmin!
                  .from("Payment")
                  .insert({ ...paymentDataNoPayer, id: newPaymentId })
                  .select()
                  .single();

                newPayment = retryRes.data;
                createPaymentErr = retryRes.error;
              } catch (e) {
                createPaymentErr = e as any;
              }
            }
          }

          if (createPaymentErr) {
            console.error(
              "[RECEIPT] Payment create error after retry:",
              createPaymentErr,
            );
            return NextResponse.json(
              { error: "Failed to create payment record" },
              { status: 500 },
            );
          }

          paymentRecord = newPayment;
        }
      }
    }

    console.log(
      `[RECEIPT] User ${userId} submitted receipt: ${uploadResult.storagePath}`,
    );

    return NextResponse.json(
      {
        success: true,
        publicUrl: uploadResult.publicUrl,
        storagePath: uploadResult.storagePath,
        paymentId: paymentRecord?.id || null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[RECEIPT POST ERROR]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
