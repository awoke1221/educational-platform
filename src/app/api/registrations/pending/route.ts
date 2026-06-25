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

    // Fetch pending registrations from UserRegistration table
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

    // Normalize to a simple pending item list
    const items = (registrations || []).map((r: any) => ({
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
      paymentStatus: r.paymentStatus || "pending",
      createdAt: r.submittedAt,
      isApproved: r.isApproved,
    }));

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err) {
    console.error("[PENDING GET ERROR]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
