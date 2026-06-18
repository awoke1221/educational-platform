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
    const body = await request.json();
    const { reason } = body || {};

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[REJECT POST ERROR]", err);
    return NextResponse.json({ error: "Reject failed" }, { status: 500 });
  }
}
