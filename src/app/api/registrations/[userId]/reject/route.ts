import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { requireRole, verifyAuth } from "@/lib/auth/middleware";
import { StorageService } from "@/lib/storage/supabase";
import { EmailService } from "@/lib/email";

/**
 * Delete a receipt file from storage and clear its URL/key from the DB.
 * This is a best-effort cleanup — failures are logged but never fail the
 * overall rejection operation.
 */
async function clearReceiptFromPayment(payment: any): Promise<void> {
  if (payment?.receiptScreenshotKey) {
    const result = await StorageService.deleteFile(
      payment.receiptScreenshotKey,
    );
    if (!result.success) {
      console.warn(
        "[REJECT] Failed to delete receipt file from storage:",
        payment.receiptScreenshotKey,
        result.error,
      );
    }
  }

  // Clear the URL and storage key from the Payment record
  const clearFields: Record<string, any> = {
    receiptScreenshotUrl: null,
    receiptScreenshotKey: null,
  };
  // Only include fields that currently have a value (to avoid unnecessary writes)
  if (!payment?.receiptScreenshotUrl) delete clearFields.receiptScreenshotUrl;
  if (!payment?.receiptScreenshotKey) delete clearFields.receiptScreenshotKey;

  if (Object.keys(clearFields).length > 0) {
    const { error: clearErr } = await supabaseAdmin!
      .from("Payment")
      .update(clearFields)
      .eq("id", payment.id);
    if (clearErr) {
      console.warn(
        "[REJECT] Failed to clear Payment receipt fields:",
        clearErr,
      );
    }
  }
}

/**
 * Clear the pendingReceiptUrl from a UserRegistration record.
 */
async function clearRegistrationReceiptUrl(userId: string): Promise<void> {
  const { error: clearErr } = await supabaseAdmin!
    .from("UserRegistration")
    .update({ pendingReceiptUrl: null })
    .eq("userId", userId);
  if (clearErr) {
    console.warn(
      "[REJECT] Failed to clear UserRegistration pendingReceiptUrl:",
      clearErr,
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const roleErr = await requireRole(request, ["admin"]);
    if (roleErr) return roleErr;

    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { courseId, reason: rejectionReason } = body || {};

    if (courseId) {
      const { data: enrollment, error: enrollLookupErr } = await supabaseAdmin!
        .from("Enrollment")
        .select("*")
        .eq("userId", userId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (enrollLookupErr) {
        console.error("[REJECT ENROLLMENT LOOKUP ERROR]", enrollLookupErr);
        return NextResponse.json(
          { error: "Failed to find enrollment" },
          { status: 500 },
        );
      }

      if (!enrollment) {
        return NextResponse.json(
          { error: "Enrollment not found" },
          { status: 404 },
        );
      }

      const { error: enrollErr } = await supabaseAdmin!
        .from("Enrollment")
        .update({
          status: "rejected",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", enrollment.id);

      if (enrollErr) {
        console.error("[REJECT ENROLLMENT ERROR]", enrollErr);
        return NextResponse.json(
          { error: "Failed to reject enrollment" },
          { status: 500 },
        );
      }

      const { error: paymentErr } = await supabaseAdmin!
        .from("Payment")
        .update({
          status: "rejected",
          rejectionReason,
          rejectedAt: new Date().toISOString(),
        })
        .eq("enrollmentId", enrollment.id)
        .eq("status", "pending");

      if (paymentErr) {
        console.error("[REJECT PAYMENT ERROR]", paymentErr);
        return NextResponse.json(
          { error: "Failed to reject payment" },
          { status: 500 },
        );
      }

      const now = new Date().toISOString();
      const { error: userError } = await supabaseAdmin!
        .from("UserRegistration")
        .update({
          isApproved: false,
          paymentStatus: "rejected",
          reviewedAt: now,
          reviewedBy: auth.userId,
        })
        .eq("userId", userId);

      if (userError) {
        console.error("[REJECT USERREGISTRATION ERROR]", userError);
        return NextResponse.json(
          { error: "Failed to update user status" },
          { status: 500 },
        );
      }

      // ── Cleanup: delete receipt file from storage and clear URL fields ──
      // Fetch the payment record to get the storage key
      const { data: paymentForCleanup } = await supabaseAdmin!
        .from("Payment")
        .select("id, receiptScreenshotUrl, receiptScreenshotKey")
        .eq("enrollmentId", enrollment.id)
        .eq("status", "rejected")
        .maybeSingle();

      if (paymentForCleanup) {
        await clearReceiptFromPayment(paymentForCleanup);
      }
      await clearRegistrationReceiptUrl(userId);

      // Mark the AdminApprovalQueue entry as reviewed
      const { data: rejectedPayment } = await supabaseAdmin!
        .from("Payment")
        .select("id")
        .eq("enrollmentId", enrollment.id)
        .eq("status", "rejected")
        .maybeSingle();

      if (rejectedPayment) {
        await supabaseAdmin!
          .from("AdminApprovalQueue")
          .update({ isReviewed: true, viewedAt: new Date().toISOString() })
          .eq("paymentId", rejectedPayment.id)
          .eq("isReviewed", false)
          .maybeSingle();
      }

      const [{ data: user }, { data: course }] = await Promise.all([
        supabaseAdmin!
          .from("User")
          .select("email, fullName")
          .eq("id", userId)
          .maybeSingle(),
        supabaseAdmin!
          .from("Course")
          .select("id, title")
          .eq("id", courseId)
          .maybeSingle(),
      ]);
      await EmailService.localPaymentRejected(
        user,
        course?.title || "your course",
        rejectionReason,
      );
      console.log(
        `[REJECT] Enrollment rejected for user ${userId} course ${courseId}`,
      );
      // no notification email sent for enrollment rejection

      return NextResponse.json({ success: true, courseId }, { status: 200 });
    }

    // ── Global rejection: reject the user and ALL their pending enrollments ──
    // Also update any processing enrollments and their pending payments so
    // the user's course statuses reflect the rejection.
    const { data: pendingEnrollments } = await supabaseAdmin!
      .from("Enrollment")
      .select("id, courseId")
      .eq("userId", userId)
      .eq("status", "processing");

    if (pendingEnrollments && pendingEnrollments.length > 0) {
      const enrollmentIds = pendingEnrollments.map((e: any) => e.id);

      // Update all processing enrollments to rejected
      const { error: batchEnrollErr } = await supabaseAdmin!
        .from("Enrollment")
        .update({
          status: "rejected",
          updatedAt: new Date().toISOString(),
        })
        .in("id", enrollmentIds);

      if (batchEnrollErr) {
        console.error("[REJECT BATCH ENROLLMENT ERROR]", batchEnrollErr);
      }

      // Update all pending payments for these enrollments to rejected
      const { error: batchPaymentErr } = await supabaseAdmin!
        .from("Payment")
        .update({
          status: "rejected",
          rejectionReason: rejectionReason || null,
          rejectedAt: new Date().toISOString(),
        })
        .in("enrollmentId", enrollmentIds)
        .eq("status", "pending");

      if (batchPaymentErr) {
        console.error("[REJECT BATCH PAYMENT ERROR]", batchPaymentErr);
      }

      // ── Cleanup: delete receipt files from storage and clear URL fields ──
      const { data: paymentsForCleanup } = await supabaseAdmin!
        .from("Payment")
        .select("id, receiptScreenshotUrl, receiptScreenshotKey")
        .in("enrollmentId", enrollmentIds)
        .eq("status", "rejected");

      if (paymentsForCleanup && paymentsForCleanup.length > 0) {
        await Promise.allSettled(
          paymentsForCleanup.map((p: any) => clearReceiptFromPayment(p)),
        );
      }
    }

    // Also clear the UserRegistration pendingReceiptUrl
    await clearRegistrationReceiptUrl(userId);

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin!
      .from("UserRegistration")
      .update({
        isApproved: false,
        paymentStatus: "rejected",
        reviewedAt: now,
        reviewedBy: auth.userId,
      })
      .eq("userId", userId);

    if (error) {
      console.error("[REJECT USERREGISTRATION ERROR]", error);
      return NextResponse.json(
        { error: "Failed to reject user" },
        { status: 500 },
      );
    }

    // Mark all unreviewed queue entries for this user's payments as reviewed
    const { data: userPayments } = await supabaseAdmin!
      .from("Payment")
      .select("id")
      .eq("userId", userId);

    if (userPayments && userPayments.length > 0) {
      await supabaseAdmin!
        .from("AdminApprovalQueue")
        .update({ isReviewed: true, viewedAt: new Date().toISOString() })
        .eq("isReviewed", false)
        .in(
          "paymentId",
          userPayments.map((p: any) => p.id),
        );
    }

    const { data: user } = await supabaseAdmin!
      .from("User")
      .select("email, fullName")
      .eq("id", userId)
      .maybeSingle();
    await Promise.all(
      (pendingEnrollments || []).map(async (enrollment: any) => {
        const { data: course } = await supabaseAdmin!
          .from("Course")
          .select("title")
          .eq("id", enrollment.courseId)
          .maybeSingle();
        await EmailService.localPaymentRejected(
          user,
          course?.title || "your course",
          rejectionReason,
        );
      }),
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[REJECT POST ERROR]", err);
    return NextResponse.json({ error: "Reject failed" }, { status: 500 });
  }
}
