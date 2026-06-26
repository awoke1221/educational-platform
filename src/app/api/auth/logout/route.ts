// src/app/api/auth/logout/route.ts
// Logout — Supabase Auth
//
// Revokes the Supabase session and clears cookies.

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { getSupabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getSupabaseAnon } from "@/lib/db/supabaseAnonClient";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    // ── Sign out via Supabase Auth ──────────────────────────────
    const supabase = getSupabaseAnon();

    // Set the user's access token so signOut can revoke it
    supabase.auth.setSession({
      access_token: request.headers.get("Authorization")!.slice(7),
      refresh_token: "",
    });

    await supabase.auth.signOut().catch(() => {
      // Non-fatal — best-effort token revocation
    });

    // ── Device session cleanup ──────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as {
      logoutFromAllDevices?: boolean;
    };

    const logoutFromAllDevices = body.logoutFromAllDevices === true;

    const supabaseAdmin = getSupabaseAdmin();

    if (logoutFromAllDevices) {
      await supabaseAdmin!
        .from("DeviceSession")
        .update({ isActive: false, logoutAt: new Date().toISOString() })
        .eq("userId", auth.userId);

      console.log(`[AUDIT] User ${auth.userId} logged out from all devices`);
    }

    // ── Clear cookies ──────────────────────────────────────────
    const clearCookie =
      "sb-access-token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
    const clearRefreshCookie =
      "sb-refresh-token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";

    const headers = new Headers();
    headers.append("Set-Cookie", clearCookie);
    headers.append("Set-Cookie", clearRefreshCookie);

    return NextResponse.json(
      {
        success: true,
        message: logoutFromAllDevices
          ? "Logged out from all devices"
          : "Logged out successfully",
      },
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error("[LOGOUT ERROR]", error);

    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
