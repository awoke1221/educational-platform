import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { jwtService } from "@/lib/auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);
    if (!payload || payload.role !== "admin") {
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

    // Build query
    let query = db
      .from("User")
      .select("*", { count: "exact" })
      .eq("isApproved", false)
      .eq("paymentStatus", "submitted")
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,fullName.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[ADMIN REGISTRATIONS] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        registrations: data || [],
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
    // Verify admin token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);
    if (!payload || payload.role !== "admin") {
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
