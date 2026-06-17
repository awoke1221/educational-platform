// src/app/api/user/devices/route.ts
// Device Management API Endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/supabase";
import { successResponse, errorResponse } from "@/lib/utils/api";

// ============================================
// GET - List User's Devices
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Fetch all device sessions for user
    const devices = await prisma.deviceSession.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
        isActive: true,
        loginAt: true,
        logoutAt: true,
        ipAddress: true,
      },
      orderBy: { loginAt: "desc" },
    });

    return successResponse(devices, "Devices retrieved successfully");
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
    // Verify authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const auth = await verifyAuth(request);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Get device ID from query params
    const deviceId = request.nextUrl.searchParams.get("deviceId");

    if (!deviceId) {
      return errorResponse("Device ID is required", 400);
    }

    // Verify device belongs to user
    const device = await prisma.deviceSession.findFirst({
      where: {
        userId: auth.userId,
        deviceId,
      },
    });

    if (!device) {
      return errorResponse("Device not found", 404);
    }

    // Logout from device
    await prisma.deviceSession.update({
      where: { id: device.id },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    console.log(
      `[AUDIT] User ${auth.userId} logged out from device ${deviceId}`,
    );

    return successResponse(null, "Device logged out successfully");
  } catch (error) {
    console.error("[DELETE DEVICE ERROR]", error);
    return errorResponse("Failed to logout device", 500);
  }
}
