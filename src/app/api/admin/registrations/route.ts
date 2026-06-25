import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, hasRole } from "@/lib/auth/middleware";

function getDb() {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin token via Supabase Auth
    const auth = await verifyAuth(req);
    if (!auth || !(await hasRole(auth, ["admin"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") || "pending";
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * limit;

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Build query — reads from AdminApprovalQueue, JOINs Payment, User, and Course
    let query = db
      .from("AdminApprovalQueue")
      .select(
        `
        id,
        submittedAt,
        isReviewed,
        viewedAt,
        payment:paymentId(
          amount,
          receiptScreenshotUrl,
          paymentMethod,
          status,
          user:userId(fullName, email),
          course:courseId(title)
        )
      `,
        { count: "exact" },
      )
      .eq("isReviewed", false)
      .order("submittedAt", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("[ADMIN REGISTRATIONS] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 500 },
      );
    }

    // Flatten the nested response for the frontend
    const registrations = (data || []).map((item: any) => ({
      id: item.id,
      submittedAt: item.submittedAt,
      isReviewed: item.isReviewed,
      viewedAt: item.viewedAt,
      amount: item.payment?.amount ?? null,
      receiptScreenshotUrl: item.payment?.receiptScreenshotUrl ?? null,
      paymentMethod: item.payment?.paymentMethod ?? null,
      paymentStatus: item.payment?.status ?? null,
      fullName: item.payment?.user?.fullName ?? null,
      email: item.payment?.user?.email ?? null,
      courseTitle: item.payment?.course?.title ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        registrations,
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[ADMIN REGISTRATIONS GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Verify admin token via Supabase Auth
    const auth = await verifyAuth(req);
    if (!auth || !(await hasRole(auth, ["admin"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Update user approval status
    const updateData =
      action === "approve"
        ? { isApproved: true, paymentStatus: "approved" }
        : { paymentStatus: "rejected" };

    const { error } = await db.from("User").update(updateData).eq("id", userId);

    if (error) {
      console.error("[ADMIN REGISTRATIONS PATCH]", error);
      return NextResponse.json(
        { error: "Failed to update registration" },
        { status: 500 },
      );
    }

    // Mark all unreviewed AdminApprovalQueue entries for this user as reviewed
    const { error: queueError } = await db
      .from("AdminApprovalQueue")
      .update({
        isReviewed: true,
        viewedAt: new Date().toISOString(),
      })
      .eq("isReviewed", false)
      .in(
        "paymentId",
        (await db.from("Payment").select("id").eq("userId", userId)).data?.map(
          (p: any) => p.id,
        ) ?? [],
      );

    if (queueError) {
      console.error(
        "[ADMIN REGISTRATIONS PATCH] Queue update error:",
        queueError,
      );
      // Non-fatal — the user record was already updated
    }

    return NextResponse.json({
      success: true,
      message: `Registration ${action}ed successfully`,
    });
  } catch (err) {
    console.error("[ADMIN REGISTRATIONS PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
