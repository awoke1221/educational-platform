// ============================================
// 🐰 Bunny Health Check API (Storage + Stream)
// ============================================
// GET /api/bunny/health - Verify Bunny connectivity
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyService, BunnyStreamService } from "@/lib/bunny";
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

    const storageHealth = await BunnyService.healthCheck();
    const streamConfigured = BunnyStreamService.isConfigured();

    return successResponse(
      {
        storage: storageHealth,
        stream: {
          ok: streamConfigured,
          configured: streamConfigured,
          libraryId: streamConfigured ? "configured" : "not configured",
          message: streamConfigured
            ? "Bunny Stream is configured"
            : "Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.",
        },
        status: storageHealth.ok || streamConfigured ? "healthy" : "unhealthy",
      },
      storageHealth.ok
        ? "Bunny services operational"
        : "Bunny services partially configured",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
