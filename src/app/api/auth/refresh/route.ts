// src/app/api/auth/refresh/route.ts
// Refresh Token API Endpoint

import { NextRequest, NextResponse } from "next/server";
import { jwtService } from "@/lib/auth/jwt";
import { refreshTokenSchema } from "@/lib/validators/schemas";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // STEP 1: Get Refresh Token from Cookie or Body
    // ============================================
    let refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      const body = await request.json();
      const validation = refreshTokenSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid refresh token" },
          { status: 401 },
        );
      }

      refreshToken = validation.data.refreshToken;
    }

    // ============================================
    // STEP 2: Verify Refresh Token
    // ============================================
    let payload;
    try {
      payload = jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      console.warn("[SECURITY] Invalid refresh token attempt");
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 },
      );
    }

    // ============================================
    // STEP 3: Verify User Still Exists and Active
    // ============================================
    const { data: user, error: userErr } = await supabaseAdmin!
      .from("User")
      .select("id, email, role, isActive, isBanned")
      .eq("id", payload.userId)
      .single();

    if (userErr || !user || !user.isActive || user.isBanned) {
      return NextResponse.json(
        { error: "User account is no longer valid" },
        { status: 403 },
      );
    }

    // ============================================
    // STEP 4: Verify Device Session if DeviceId Present
    // ============================================
    if (payload.deviceId) {
      const { data: deviceSession } = await supabaseAdmin!
        .from("DeviceSession")
        .select("isActive")
        .eq("userId", user.id)
        .eq("deviceId", payload.deviceId)
        .maybeSingle();

      if (!deviceSession || !deviceSession.isActive) {
        return NextResponse.json(
          { error: "Device session is no longer active" },
          { status: 403 },
        );
      }
    }

    // ============================================
    // STEP 5: Generate New Access Token
    // ============================================
    const newAccessToken = jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId: payload.deviceId,
    });

    // ============================================
    // STEP 6: Return New Access Token
    // ============================================
    return NextResponse.json(
      {
        success: true,
        accessToken: newAccessToken,
        expiresIn: parseInt(process.env.JWT_EXPIRATION || "900"),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[REFRESH TOKEN ERROR]", error);

    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }
}
