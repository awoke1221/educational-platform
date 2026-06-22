// ============================================
// 🎬 Public Video Upload API
// ============================================
// Handles video uploads that don't require authentication
// (e.g., hero videos, landing page content managed by admins).
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
// POST /api/upload/public-video
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "admin") {
      return errorResponse("Only admins can upload public videos", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
    if (!allowedVideoTypes.includes(file.type)) {
      return errorResponse(
        "Invalid video format. Allowed: MP4, WebM, OGG",
        400,
      );
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return errorResponse("File too large. Max size: 500MB", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await BunnyService.uploadFile(buffer, file.type, {
      folder: "educational-platform/public-videos",
      publicId: `public-${Date.now()}`,
    });

    return successResponse(
      {
        url: result.url,
        bytes: result.bytes,
        mimeType: result.mimeType,
        filename: result.filename,
      },
      "Public video uploaded successfully",
      201,
    );
  } catch (error) {
    console.error("[PUBLIC VIDEO UPLOAD ERROR]", error);
    return handleApiError(error);
  }
}
