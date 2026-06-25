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

    // Build query — reads from UserRegistration, JOINs User
    let query = db.from("UserRegistration").select(
      `
        id,
        userId,
        isApproved,
        pendingReceiptUrl,
        paymentMethod,
        paymentStatus,
        submittedAt,
        reviewedAt,
        reviewedBy,
        User!userId (
          id,
          fullName,
          email
        )
      `,
      { count: "exact" },
    );

    // Filter by status
    if (status === "pending") {
      // Registrations needing admin review: submitted payment, not yet approved
      query = query.in("paymentStatus", ["pending", "rejected"]);
    } else if (status === "approved") {
      query = query.eq("isApproved", true);
    } else if (status === "all") {
      // No extra filter
    }

    if (search) {
      query = query.or(
        `User.fullName.ilike.%${search}%,User.email.ilike.%${search}%`,
      );
    }

    query = query
      .order("submittedAt", { ascending: false, nullsFirst: false })
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
      userId: item.userId,
      submittedAt: item.submittedAt,
      isApproved: item.isApproved,
      reviewedAt: item.reviewedAt,
      reviewedBy: item.reviewedBy,
      pendingReceiptUrl: item.pendingReceiptUrl,
      paymentMethod: item.paymentMethod,
      paymentStatus: item.paymentStatus,
      fullName: item.User?.fullName ?? null,
      email: item.User?.email ?? null,
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
    const { registrationId, action } = body;

    if (!registrationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Update UserRegistration approval status
    const updateData =
      action === "approve"
        ? {
            isApproved: true,
            paymentStatus: "approved",
            reviewedAt: new Date().toISOString(),
            reviewedBy: auth?.userId || null,
          }
        : {
            paymentStatus: "rejected",
            reviewedAt: new Date().toISOString(),
            reviewedBy: auth?.userId || null,
          };

    const { error } = await db
      .from("UserRegistration")
      .update(updateData)
      .eq("id", registrationId);

    if (error) {
      console.error("[ADMIN REGISTRATIONS PATCH]", error);
      return NextResponse.json(
        { error: "Failed to update registration" },
        { status: 500 },
      );
    }

    // Also update the User role to 'user' on approval if not already set
    if (action === "approve") {
      const { data: reg } = await db
        .from("UserRegistration")
        .select("userId")
        .eq("id", registrationId)
        .single();
      if (reg?.userId) {
        await db
          .from("User")
          .update({ role: "user", isActive: true })
          .eq("id", reg.userId);

        // Also activate all pending enrollments and payments for this user
        const now = new Date().toISOString();
        await db
          .from("Enrollment")
          .update({ status: "active", updatedAt: now })
          .eq("userId", reg.userId)
          .eq("status", "processing");
        await db
          .from("Payment")
          .update({
            status: "approved",
            approvedAt: now,
            approvedBy: auth?.userId || null,
          })
          .eq("userId", reg.userId)
          .eq("status", "pending");
      }
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
