// ============================================
// 🐰 Bunny Storage Management API
// ============================================
// GET  /api/bunny/storage?path=...  - List files
// DELETE /api/bunny/storage          - Delete files
// POST /api/bunny/storage/folder     - Create folder
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import BunnyService from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// GET - List files in a storage directory
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin" && auth.role !== "instructor") {
      return errorResponse("Access denied", 403);
    }

    const path = request.nextUrl.searchParams.get("path") || "";

    const files = await BunnyService.listFiles(path);
    const totalSize = files.reduce(
      (sum, f) => sum + (f.isDirectory ? 0 : f.length),
      0,
    );

    return successResponse(
      {
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
// DELETE - Delete files from storage
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

    const { paths } = body as { paths: string[] };
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return errorResponse("Provide at least one file path to delete", 400);
    }

    const result = await BunnyService.deleteFiles(paths);

    if (result.failed > 0) {
      return successResponse(
        result,
        `Deleted ${result.succeeded} file(s), ${result.failed} failed`,
        207, // Multi-Status
      );
    }

    return successResponse(result, `Deleted ${result.succeeded} file(s)`);
  } catch (error) {
    return handleApiError(error);
  }
}
