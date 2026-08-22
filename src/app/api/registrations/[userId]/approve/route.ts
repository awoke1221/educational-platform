import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { requireRole, verifyAuth } from "@/lib/auth/middleware";
import { EmailService } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    // require admin role
    const roleErr = await requireRole(request, ["admin"]);
    if (roleErr) return roleErr;

    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;

    const body = await request.json().catch(() => ({}));
    const { courseId } = body || {};

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // If courseId provided, approve enrollment for that course only
    if (courseId) {
      const { data: enrollment, error: enrollLookupErr } = await supabaseAdmin!
        .from("Enrollment")
        .select("*")
        .eq("userId", userId)
        .eq("courseId", courseId)
        .maybeSingle();

      if (enrollLookupErr) {
        console.error("[APPROVE ENROLLMENT LOOKUP ERROR]", enrollLookupErr);
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

      if (enrollment.status === "active") {
        return NextResponse.json(
          { error: "Enrollment already active" },
          { status: 409 },
        );
      }

      const { error: enrollErr } = await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "active", updatedAt: new Date().toISOString() })
        .eq("id", enrollment.id);

      if (enrollErr) {
        console.error("[APPROVE ENROLLMENT ERROR]", enrollErr);
        return NextResponse.json(
          { error: "Failed to approve enrollment" },
          { status: 500 },
        );
      }

      const { error: paymentErr } = await supabaseAdmin!
        .from("Payment")
        .update({ status: "approved", approvedAt: new Date().toISOString() })
        .eq("enrollmentId", enrollment.id)
        .eq("status", "pending");

      if (paymentErr) {
        console.error("[APPROVE PAYMENT ERROR]", paymentErr);
        return NextResponse.json(
          { error: "Failed to update payment record" },
          { status: 500 },
        );
      }

      const now = new Date().toISOString();
      const { error: userError } = await supabaseAdmin!
        .from("UserRegistration")
        .update({
          isApproved: true,
          paymentStatus: "approved",
          reviewedAt: now,
          reviewedBy: auth.userId,
        })
        .eq("userId", userId);

      if (userError) {
        console.error("[APPROVE USERREGISTRATION ERROR]", userError);
        return NextResponse.json(
          { error: "Failed to update user approval status" },
          { status: 500 },
        );
      }

      // enrollmentCount is now updated automatically by the trigger
      // trg_sync_course_enrollment_count on Enrollment (see migration
      // 20260625060000_fix_write_hotspots.sql). No manual UPDATE needed.

      // Mark the AdminApprovalQueue entry as reviewed
      const { data: approvedPayment } = await supabaseAdmin!
        .from("Payment")
        .select("id")
        .eq("enrollmentId", enrollment.id)
        .eq("status", "approved")
        .maybeSingle();

      if (approvedPayment) {
        await supabaseAdmin!
          .from("AdminApprovalQueue")
          .update({ isReviewed: true, viewedAt: new Date().toISOString() })
          .eq("paymentId", approvedPayment.id)
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
      await EmailService.localPaymentApproved(
        user,
        course?.title || "your course",
        courseId,
      );
      console.log(
        `[APPROVE] Enrollment activated for user ${userId} course ${courseId}`,
      );
      // no notification email sent for enrollment approval

      return NextResponse.json({ success: true, courseId }, { status: 200 });
    }

    // ── Global approval: approve the user and ALL their pending enrollments ──
    // Also update any processing enrollments and their pending payments so
    // the user's course statuses reflect the approval.
    const { data: pendingEnrollments } = await supabaseAdmin!
      .from("Enrollment")
      .select("id, courseId")
      .eq("userId", userId)
      .eq("status", "processing");

    if (pendingEnrollments && pendingEnrollments.length > 0) {
      const enrollmentIds = pendingEnrollments.map((e: any) => e.id);

      // Update all processing enrollments to active
      const { error: batchEnrollErr } = await supabaseAdmin!
        .from("Enrollment")
        .update({ status: "active", updatedAt: new Date().toISOString() })
        .in("id", enrollmentIds);

      if (batchEnrollErr) {
        console.error("[APPROVE BATCH ENROLLMENT ERROR]", batchEnrollErr);
      }

      // Update all pending payments for these enrollments to approved
      const { error: batchPaymentErr } = await supabaseAdmin!
        .from("Payment")
        .update({
          status: "approved",
          approvedAt: new Date().toISOString(),
        })
        .in("enrollmentId", enrollmentIds)
        .eq("status", "pending");

      if (batchPaymentErr) {
        console.error("[APPROVE BATCH PAYMENT ERROR]", batchPaymentErr);
      }
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin!
      .from("UserRegistration")
      .update({
        isApproved: true,
        paymentStatus: "approved",
        reviewedAt: now,
        reviewedBy: auth.userId,
      })
      .eq("userId", userId);

    if (error) {
      console.error("[APPROVE USERREGISTRATION ERROR]", error);
      return NextResponse.json(
        { error: "Failed to approve user" },
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
          .select("id, title")
          .eq("id", enrollment.courseId)
          .maybeSingle();
        await EmailService.localPaymentApproved(
          user,
          course?.title || "your course",
          enrollment.courseId,
        );
      }),
    );
    console.log(`[APPROVE] User ${userId} approved (global)`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[APPROVE POST ERROR]", err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
