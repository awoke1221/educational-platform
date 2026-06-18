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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { error } = await supabaseAdmin
      .from("User")
      .update({ isApproved: true, paymentStatus: "approved" })
      .eq("id", userId);

    if (error) {
      console.error("[APPROVE ERROR]", error);
      return NextResponse.json(
        { error: "Failed to approve user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[APPROVE POST ERROR]", err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
