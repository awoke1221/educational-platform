// src/app/api/upload/route.ts
// Upload API — Videos → Bunny Stream, Images → Bunny Storage

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { BunnyService, BunnyStreamService } from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// POST /api/upload - Upload file
// Videos → Bunny Stream (HLS adaptive bitrate)
// Images → Bunny Storage + Pull Zone CDN
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    if (auth.role !== "instructor" && auth.role !== "admin") {
      return errorResponse("Only instructors can upload files", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "video";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    const maxSize = type === "video" ? 5 * 1024 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse(
        `File too large. Max size: ${type === "video" ? "5GB" : "5MB"}`,
        400,
      );
    }

    if (type === "video") {
      // ============================================
      // VIDEOS → Bunny Stream HLS
      // ============================================
      const allowedVideoTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
      ];
      if (!allowedVideoTypes.includes(file.type)) {
        return errorResponse(
          "Invalid video format. Allowed: MP4, WebM, OGG, MOV, AVI, MKV",
          400,
        );
      }

      if (!BunnyStreamService.isConfigured()) {
        return errorResponse(
          "Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.",
          500,
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await BunnyStreamService.createAndUploadVideo(
        buffer,
        file.type,
        file.name.replace(/\.[^.]+$/, ""),
      );

      console.log(
        `[AUDIT] Bunny Stream upload succeeded: ${result.videoId} by user ${auth.userId}`,
      );

      return successResponse(
        {
          publicId: result.videoId,
          videoId: result.videoId,
          url: result.hlsUrl,
          embedUrl: result.embedUrl,
          hlsUrl: result.hlsUrl,
          thumbnailUrl: result.thumbnailUrl,
          bytes: file.size,
          mimeType: file.type,
          filename: file.name,
          streamingUrl: result.hlsUrl,
        },
        "Video uploaded to Bunny Stream successfully",
        201,
      );
    } else {
      // ============================================
      // IMAGES → Bunny Storage + Pull Zone CDN
      // ============================================
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedImageTypes.includes(file.type)) {
        return errorResponse(
          "Invalid image format. Allowed: JPEG, PNG, WebP",
          400,
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const folder = `educational-platform/covers/${auth.userId}`;

      const result = await BunnyService.uploadFile(buffer, file.type, {
        folder,
        publicId: `${auth.userId}-${Date.now()}`,
      });

      console.log(
        `[AUDIT] Bunny Storage upload succeeded: ${result.storagePath} by user ${auth.userId}`,
      );

      return successResponse(
        {
          publicId: result.storagePath,
          url: result.url,
          bytes: result.bytes,
          mimeType: result.mimeType,
          filename: result.filename,
          streamingUrl: result.url,
          thumbnail: result.url,
        },
        "Image uploaded successfully",
        201,
      );
    }
  } catch (error) {
    console.error("[UPLOAD ERROR]", error);
    return handleApiError(error);
  }
}

// ============================================
// GET /api/upload - Upload metadata endpoint
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    return successResponse(
      {
        uploadUrl: "/api/upload",
        provider: "bunny-stream",
        streamConfigured: BunnyStreamService.isConfigured(),
      },
      "Upload endpoint available",
    );
  } catch (error) {
    console.error("[UPLOAD METADATA ERROR]", error);
    return handleApiError(error);
  }
}
