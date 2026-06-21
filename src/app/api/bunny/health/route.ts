// ============================================
// 🐰 Bunny Health Check API
// ============================================
// GET /api/bunny/health - Verify Bunny connectivity
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import BunnyService from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin") {
      return errorResponse("Access denied", 403);
    }

    const health = await BunnyService.healthCheck();

    if (!health.ok) {
      return successResponse(health, health.message, 503);
    }

    return successResponse(health, health.message);
  } catch (error) {
    return handleApiError(error);
  }
}
