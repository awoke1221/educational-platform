import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { requireRole } from "@/lib/auth/middleware";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

    // ── Parse pagination params ─────────────────────────────────
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
    const offset = (page - 1) * limit;

    // ── Step 1: Fetch total count + page of pending registrations ──
    // Pending = has submitted payment (pending/rejected) but not yet approved
    const countQuery = supabaseAdmin!
      .from("UserRegistration")
      .select("*", { count: "exact", head: true })
      .in("paymentStatus", ["pending", "rejected"]);

    const dataQuery = supabaseAdmin!
      .from("UserRegistration")
      .select(
        `id, userId, isApproved, pendingReceiptUrl, paymentMethod, paymentStatus, submittedAt,
         User!userId (id, username, email, fullName, phoneNumber)`,
      )
      .in("paymentStatus", ["pending", "rejected"])
      .order("submittedAt", { ascending: false })
      .range(offset, offset + limit - 1);

    const [{ count }, { data: registrations, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error) {
      console.error("[PENDING FETCH ERROR]", error);
      return NextResponse.json(
        { error: "Failed to fetch pending registrations" },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const pages = Math.ceil(total / limit);
    const hasMore = page < pages;

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
          const courseInfo = Array.isArray(enr.Course)
            ? enr.Course[0]
            : enr.Course;

          const userData = Array.isArray(r.User) ? r.User[0] : r.User;
          items.push({
            entryId: enr.id, // enrollment id
            registrationId: r.id,
            userId: r.userId,
            id: r.userId,
            username: userData?.username || "",
            email: userData?.email || "",
            fullName: userData?.fullName || "",
            phoneNumber: userData?.phoneNumber || "",
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
            courseTitle: courseInfo?.title || null,
            coursePrice: courseInfo?.price ? Number(courseInfo.price) : null,
          });
        }
      } else {
        // No specific course — user-level registration only
        const userData = Array.isArray(r.User) ? r.User[0] : r.User;
        items.push({
          entryId: r.id,
          registrationId: r.id,
          userId: r.userId,
          id: r.userId,
          username: userData?.username || "",
          email: userData?.email || "",
          fullName: userData?.fullName || "",
          phoneNumber: userData?.phoneNumber || "",
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

    return NextResponse.json(
      {
        success: true,
        data: items,
        pagination: {
          total,
          page,
          limit,
          pages,
          hasMore,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[PENDING GET ERROR]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
