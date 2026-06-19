import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    // require admin role
    const roleErr = await requireRole(request, ["admin"]);
    if (roleErr) return roleErr;

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

      await supabaseAdmin!
        .from("User")
        .update({ isApproved: true, paymentStatus: "approved" })
        .eq("id", userId);

      const { data: course } = await supabaseAdmin!
        .from("Course")
        .select("enrollmentCount")
        .eq("id", courseId)
        .single();

      if (course) {
        await supabaseAdmin!
          .from("Course")
          .update({ enrollmentCount: (course.enrollmentCount || 0) + 1 })
          .eq("id", courseId);
      }

      console.log(
        `[APPROVE] Enrollment activated for user ${userId} course ${courseId}`,
      );
      // no notification email sent for enrollment approval

      return NextResponse.json({ success: true, courseId }, { status: 200 });
    }

    // Otherwise, legacy behavior: approve the user globally
    const { error } = await supabaseAdmin!
      .from("User")
      .update({ isApproved: true, paymentStatus: "approved" })
      .eq("id", userId);

    if (error) {
      console.error("[APPROVE USER ERROR]", error);
      return NextResponse.json(
        { error: "Failed to approve user" },
        { status: 500 },
      );
    }

    console.log(`[APPROVE] User ${userId} approved (global)`);
    // no notification email sent for global approval
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[APPROVE POST ERROR]", err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
