import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { requireRole } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const roleErr = await requireRole(request, ["admin"]);
    if (roleErr) return roleErr;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Try to fetch pending enrollments (course-specific payments)
    const { data: enrollments, error: enrErr } = await supabaseAdmin!
      .from("Enrollment")
      .select(
        "id, userId, courseId, status, enrollmentDate, user:User(id, username, email, fullName, phoneNumber, pendingReceiptUrl, paymentMethod), course:Course(id, title, price), payment:Payment(id, status, paymentMethod, paymentType)",
      )
      .eq("status", "processing")
      .order("enrollmentDate", { ascending: false });

    if (!enrErr && enrollments && enrollments.length > 0) {
      // Normalize to a simple pending item list
      const items = enrollments.map((e: any) => {
        const payment = Array.isArray(e.payment) ? e.payment[0] : e.payment;
        return {
          entryId: e.id,
          paymentId: payment?.id || null,
          userId: e.userId,
          id: e.userId,
          username: e.user?.username || "",
          email: e.user?.email || "",
          fullName: e.user?.fullName || "",
          phoneNumber: e.user?.phoneNumber || "",
          pendingReceiptUrl: e.user?.pendingReceiptUrl || null,
          paymentMethod:
            payment?.paymentMethod || e.user?.paymentMethod || null,
          paymentType: payment?.paymentType || null,
          paymentStatus: payment?.status || "submitted",
          createdAt: e.enrollmentDate,
          courseId: e.courseId,
          courseTitle: e.course?.title || null,
          coursePrice: e.course?.price || null,
          enrollmentStatus: e.status,
        };
      });

      return NextResponse.json({ success: true, data: items }, { status: 200 });
    }

    // Fallback: previous behavior (user-level submitted payments)
    const { data, error } = await supabaseAdmin!
      .from("User")
      .select(
        "id, username, email, fullName, phoneNumber, pendingReceiptUrl, paymentMethod, paymentStatus, createdAt",
      )
      .eq("paymentStatus", "submitted")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("[PENDING FETCH ERROR]", error);
      return NextResponse.json(
        { error: "Failed to fetch pending registrations" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("[PENDING GET ERROR]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
