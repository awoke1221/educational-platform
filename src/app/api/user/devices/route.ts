// src/app/api/user/devices/route.ts
// Device Management API Endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { supabaseAdmin  } from "@/lib/db/supabaseAdmin";
import { successResponse, errorResponse } from "@/lib/utils/api";

// ============================================
// GET - List User's Devices
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: devices, error } = await supabaseAdmin!
      .from("DeviceSession")
      .select(
        "id, deviceId, deviceName, deviceType, isActive, loginAt, logoutAt, ipAddress",
      )
      .eq("userId", auth.userId)
      .order("loginAt", { ascending: false });

    if (error) throw error;

    return successResponse(devices || [], "Devices retrieved successfully");
  } catch (error) {
    console.error("[GET DEVICES ERROR]", error);
    return errorResponse("Failed to retrieve devices", 500);
  }
}

// ============================================
// DELETE - Logout from Specific Device
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    const deviceId = request.nextUrl.searchParams.get("deviceId");

    if (!deviceId) {
      return errorResponse("Device ID is required", 400);
    }

    const { data: device } = await supabaseAdmin!
      .from("DeviceSession")
      .select("id")
      .eq("userId", auth.userId)
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (!device) {
      return errorResponse("Device not found", 404);
    }

    await supabaseAdmin!
      .from("DeviceSession")
      .update({ isActive: false, logoutAt: new Date().toISOString() })
      .eq("id", device.id);

    console.log(
      `[AUDIT] User ${auth.userId} logged out from device ${deviceId}`,
    );

    return successResponse(null, "Device logged out successfully");
  } catch (error) {
    console.error("[DELETE DEVICE ERROR]", error);
    return errorResponse("Failed to logout device", 500);
  }
}

