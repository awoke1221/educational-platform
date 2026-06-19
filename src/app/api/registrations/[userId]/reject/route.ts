import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { requireRole } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const roleErr = await requireRole(request, ["admin"]);
    if (roleErr) return roleErr;

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
          rejectionReason,
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

      console.log(
        `[REJECT] Enrollment rejected for user ${userId} course ${courseId}`,
      );
      // no notification email sent for enrollment rejection

      return NextResponse.json({ success: true, courseId }, { status: 200 });
    }

    const { error } = await supabaseAdmin!
      .from("User")
      .update({ isApproved: false, paymentStatus: "rejected" })
      .eq("id", userId);

    if (error) {
      console.error("[REJECT ERROR]", error);
      return NextResponse.json(
        { error: "Failed to reject user" },
        { status: 500 },
      );
    }

    // no notification email sent for global rejection

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[REJECT POST ERROR]", err);
    return NextResponse.json({ error: "Reject failed" }, { status: 500 });
  }
}
