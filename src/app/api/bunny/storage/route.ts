// ============================================
// 🐰 Bunny Storage & Stream Management API
// ============================================
// GET  /api/bunny/storage?path=...   - List files (Storage)
// GET  /api/bunny/storage?stream=true - List videos (Stream)
// DELETE /api/bunny/storage           - Delete files (Storage) or videos (Stream)
// POST /api/bunny/storage/folder      - Create folder (Storage)
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyService, BunnyStreamService } from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET - List files in storage or videos in stream
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "instructor") {
      return errorResponse("Access denied", 403);
    }

    const isStream = request.nextUrl.searchParams.get("stream") === "true";

    if (isStream) {
      // ============================================
      // List Bunny Stream videos
      // ============================================
      if (!BunnyStreamService.isConfigured()) {
        return errorResponse("Bunny Stream is not configured", 500);
      }

      const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
      const perPage = parseInt(
        request.nextUrl.searchParams.get("perPage") || "100",
      );

      const result = await BunnyStreamService.listVideos(page, perPage);

      return successResponse(
        {
          type: "stream",
          videos: result.items.map((v) => ({
            guid: v.guid,
            title: v.title,
            length: v.length,
            status: v.status,
            views: v.views,
            dateUploaded: v.dateUploaded,
            encodeProgress: v.encodeProgress,
            hlsUrl: BunnyStreamService.getHlsUrl(v.guid),
            embedUrl: BunnyStreamService.getEmbedUrl(v.guid),
            thumbnailUrl: BunnyStreamService.getThumbnailUrl(v.guid),
          })),
          totalItems: result.totalItems,
          currentPage: result.currentPage,
          itemsPerPage: result.itemsPerPage,
        },
        "Stream videos listed successfully",
      );
    }

    // ============================================
    // List Bunny Storage files (images/docs)
    // ============================================
    const path = request.nextUrl.searchParams.get("path") || "";

    const files = await BunnyService.listFiles(path);
    const totalSize = files.reduce(
      (sum, f) => sum + (f.isDirectory ? 0 : f.length),
      0,
    );

    return successResponse(
      {
        type: "storage",
        path,
        files,
        totalFiles: files.filter((f) => !f.isDirectory).length,
        totalFolders: files.filter((f) => f.isDirectory).length,
        totalSize,
        totalSizeFormatted: BunnyService.formatFileSize(totalSize),
      },
      "Files listed successfully",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE - Delete files from storage or videos from stream
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "instructor") {
      return errorResponse("Access denied", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { paths, videoIds, type } = body as {
      paths?: string[];
      videoIds?: string[];
      type?: "storage" | "stream";
    };

    if (type === "stream" || videoIds) {
      // Delete from Bunny Stream
      const ids = videoIds || paths || [];
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return errorResponse("Provide at least one video ID to delete", 400);
      }

      const results = await Promise.allSettled(
        ids.map((id: string) => BunnyStreamService.deleteVideo(id)),
      );

      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value,
      ).length;
      const failed = results.filter(
        (r) => r.status === "rejected" || !r.value,
      ).length;

      return successResponse(
        { succeeded, failed },
        `Deleted ${succeeded} video(s) from Stream`,
      );
    }

    // Delete from Bunny Storage
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return errorResponse("Provide at least one file path to delete", 400);
    }

    const result = await BunnyService.deleteFiles(paths);

    if (result.failed > 0) {
      return successResponse(
        result,
        `Deleted ${result.succeeded} file(s), ${result.failed} failed`,
        207,
      );
    }

    return successResponse(result, `Deleted ${result.succeeded} file(s)`);
  } catch (error) {
    return handleApiError(error);
  }
}
