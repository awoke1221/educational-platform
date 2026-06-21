// ============================================
// 🐰 Bunny Statistics API
// ============================================
// GET /api/bunny/statistics - Get storage & CDN stats
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

    const [storageStats, pullZoneStats, fileList] = await Promise.all([
      BunnyService.getStorageStatistics().catch(() => null),
      BunnyService.getPullZoneStatistics().catch(() => null),
      BunnyService.listFiles("").catch(() => []),
    ]);

    const totalFiles = fileList.reduce(
      (acc, f) => (f.isDirectory ? acc : acc + 1),
      0,
    );
    const totalSize = fileList.reduce(
      (acc, f) => (f.isDirectory ? acc : acc + f.length),
      0,
    );

    return successResponse(
      {
        storage: storageStats || {
          totalBandwidthUsed: 0,
          totalRequestsServed: 0,
          cacheHitRate: 0,
          totalStorageUsed: 0,
        },
        pullZone: pullZoneStats || {
          totalBandwidthUsed: 0,
          totalRequestsServed: 0,
          cacheHitRate: 0,
          totalStorageUsed: 0,
        },
        files: {
          total: totalFiles,
          totalSize,
          totalSizeFormatted: BunnyService.formatFileSize(totalSize),
        },
        pullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || "",
        storageZone: process.env.BUNNY_STORAGE_ZONE || "",
      },
      "Statistics retrieved",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
