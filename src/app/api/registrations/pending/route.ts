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

    // ── Step 1: Fetch pending registrations from UserRegistration ──
    // Pending = has submitted payment (pending/rejected) but not yet approved
    const { data: registrations, error } = await supabaseAdmin!
      .from("UserRegistration")
      .select(
        `id, userId, isApproved, pendingReceiptUrl, paymentMethod, paymentStatus, submittedAt,
         User!userId (id, username, email, fullName, phoneNumber)`,
      )
      .in("paymentStatus", ["pending", "rejected"])
      .order("submittedAt", { ascending: false });

    if (error) {
      console.error("[PENDING FETCH ERROR]", error);
      return NextResponse.json(
        { error: "Failed to fetch pending registrations" },
        { status: 500 },
      );
    }

    // ── Step 2: Fetch associated enrollments for these users ──
    // This is critical: without courseId the approve/reject routes fall
    // through to the global path which only updates UserRegistration
    // and skips Enrollment + Payment updates.
    const userIds = (registrations || []).map((r: any) => r.userId);
    const enrollmentMap: Record<string, any[]> = {};

    if (userIds.length > 0) {
      const { data: enrollments } = await supabaseAdmin!
        .from("Enrollment")
        .select(
          `id, userId, courseId, status,
           Course!courseId (id, title, price),
           Payment!enrollmentId (id, status, paymentMethod, paymentType, amount, receiptScreenshotUrl)`,
        )
        .in("userId", userIds)
        .in("status", ["processing"]);

      for (const enr of enrollments || []) {
        if (!enrollmentMap[enr.userId]) enrollmentMap[enr.userId] = [];
        enrollmentMap[enr.userId].push(enr);
      }
    }

    // ── Step 3: Normalize to a flat pending item list ──
    // One item per enrollment (when course-specific) or one item per user
    // (when no specific course was selected).
    const items: any[] = [];

    for (const r of registrations || []) {
      const userEnrollments = enrollmentMap[r.userId] || [];

      if (userEnrollments.length > 0) {
        // Course-specific enrollment — yield one item per course
        for (const enr of userEnrollments) {
          const payment = Array.isArray(enr.Payment)
            ? enr.Payment[0]
            : enr.Payment;

          items.push({
            entryId: enr.id, // enrollment id
            registrationId: r.id,
            userId: r.userId,
            id: r.userId,
            username: r.User?.username || "",
            email: r.User?.email || "",
            fullName: r.User?.fullName || "",
            phoneNumber: r.User?.phoneNumber || "",
            // Use payment receipt if available, fall back to user-level receipt
            pendingReceiptUrl:
              payment?.receiptScreenshotUrl || r.pendingReceiptUrl || null,
            paymentMethod: payment?.paymentMethod || r.paymentMethod || null,
            paymentType: payment?.paymentType || null,
            paymentStatus: payment?.status || r.paymentStatus || "pending",
            enrollmentStatus: enr.status || null,
            createdAt: r.submittedAt,
            isApproved: r.isApproved,
            courseId: enr.courseId,
            courseTitle: enr.Course?.title || null,
            coursePrice: enr.Course?.price ? Number(enr.Course.price) : null,
          });
        }
      } else {
        // No specific course — user-level registration only
        items.push({
          entryId: r.id,
          registrationId: r.id,
          userId: r.userId,
          id: r.userId,
          username: r.User?.username || "",
          email: r.User?.email || "",
          fullName: r.User?.fullName || "",
          phoneNumber: r.User?.phoneNumber || "",
          pendingReceiptUrl: r.pendingReceiptUrl || null,
          paymentMethod: r.paymentMethod || null,
          paymentType: null,
          paymentStatus: r.paymentStatus || "pending",
          enrollmentStatus: null,
          createdAt: r.submittedAt,
          isApproved: r.isApproved,
          courseId: null,
          courseTitle: null,
          coursePrice: null,
        });
      }
    }

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err) {
    console.error("[PENDING GET ERROR]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
