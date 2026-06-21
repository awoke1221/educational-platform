// src/app/api/auth/logout/route.ts
// Logout API Endpoint with Device Session Cleanup

import { NextRequest, NextResponse } from "next/server";
import { jwtService } from "@/lib/auth/jwt";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    let payload;

    try {
      payload = jwtService.verifyAccessToken(token);
    } catch (error) {
      console.warn("[SECURITY] Invalid token in logout attempt");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      logoutFromAllDevices?: boolean;
    };

    const logoutFromAllDevices = body.logoutFromAllDevices === true;

    if (logoutFromAllDevices) {
      await supabaseAdmin!
        .from("DeviceSession")
        .update({ isActive: false, logoutAt: new Date().toISOString() })
        .eq("userId", payload.userId);

      console.log(`[AUDIT] User ${payload.userId} logged out from all devices`);
    } else if (payload.deviceId) {
      await supabaseAdmin!
        .from("DeviceSession")
        .update({ isActive: false, logoutAt: new Date().toISOString() })
        .eq("userId", payload.userId)
        .eq("deviceId", payload.deviceId);

      console.log(
        `[AUDIT] User ${payload.userId} logged out from device ${payload.deviceId}`,
      );
    }

    // ============================================
    // STEP 4: Return Success Response
    // ============================================
    return NextResponse.json(
      {
        success: true,
        message: logoutFromAllDevices
          ? "Logged out from all devices"
          : "Logged out successfully",
      },
      {
        status: 200,
        headers: {
          "Set-Cookie":
            "refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      },
    );
  } catch (error) {
    console.error("[LOGOUT ERROR]", error);

    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

