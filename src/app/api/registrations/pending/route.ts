import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
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
