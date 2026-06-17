// src/app/api/auth/logout/route.ts
// Logout API Endpoint with Device Session Cleanup

import { NextRequest, NextResponse } from "next/server";
import { jwtService } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/supabase";

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // STEP 1: Extract and Verify Access Token
    // ============================================
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

    // ============================================
    // STEP 2: Parse Request Body
    // ============================================
    const body = (await request.json().catch(() => ({}))) as {
      logoutFromAllDevices?: boolean;
    };

    const logoutFromAllDevices = body.logoutFromAllDevices === true;

    // ============================================
    // STEP 3: Handle Device Session Logout
    // ============================================
    if (logoutFromAllDevices) {
      // Logout from all devices
      await prisma.deviceSession.updateMany({
        where: { userId: payload.userId },
        data: {
          isActive: false,
          logoutAt: new Date(),
        },
      });

      console.log(`[AUDIT] User ${payload.userId} logged out from all devices`);
    } else if (payload.deviceId) {
      // Logout from specific device
      await prisma.deviceSession.updateMany({
        where: {
          userId: payload.userId,
          deviceId: payload.deviceId,
        },
        data: {
          isActive: false,
          logoutAt: new Date(),
        },
      });

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
