// ============================================
// 🎬 Public Video Upload API → Bunny Stream
// ============================================
// Handles video uploads to Bunny Stream (HLS adaptive bitrate).
// Used by admins for hero videos, landing page content, etc.
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyStreamService } from "@/lib/bunny";
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

    if (!BunnyStreamService.isConfigured()) {
      return errorResponse(
        "Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.",
        500,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    const allowedVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];
    if (!allowedVideoTypes.includes(file.type)) {
      return errorResponse(
        "Invalid video format. Allowed: MP4, WebM, OGG, MOV",
        400,
      );
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return errorResponse("File too large. Max size: 500MB", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Bunny Stream (creates video, uploads file, returns HLS URLs)
    const result = await BunnyStreamService.createAndUploadVideo(
      buffer,
      file.type,
      file.name.replace(/\.[^.]+$/, ""),
    );

    return successResponse(
      {
        videoId: result.videoId,
        url: result.hlsUrl,
        hlsUrl: result.hlsUrl,
        embedUrl: result.embedUrl,
        thumbnailUrl: result.thumbnailUrl,
        bytes: file.size,
        mimeType: file.type,
        filename: file.name,
      },
      "Public video uploaded to Bunny Stream successfully",
      201,
    );
  } catch (error) {
    console.error("[PUBLIC VIDEO UPLOAD ERROR]", error);
    return handleApiError(error);
  }
}
