// ============================================
// 🐰 Bunny Cache Purge API
// ============================================
// POST /api/bunny/purge - Purge CDN cache
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import BunnyService from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin") {
      return errorResponse("Only admins can purge cache", 403);
    }

    const body = await request.json().catch(() => ({}));
    const { url, type } = body as { url?: string; type?: "single" | "all" };

    if (type === "all") {
      const result = await BunnyService.purgePullZone();
      return successResponse(result, result.message || "Cache purged");
    }

    if (url) {
      const result = await BunnyService.purgeFile(url);
      return successResponse(result, result.message || "File purged");
    }

    // Default: purge entire pull zone
    const result = await BunnyService.purgePullZone();
    return successResponse(result, result.message || "Cache purged");
  } catch (error) {
    return handleApiError(error);
  }
}
