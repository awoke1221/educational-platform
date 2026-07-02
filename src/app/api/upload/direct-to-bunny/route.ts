// ============================================
// 🐰 Direct-to-Bunny Upload API (Stream for videos, Storage for images)
// ============================================
// Generates an upload URL so the browser can upload directly:
// - Videos → Bunny Stream (HLS adaptive bitrate streaming)
// - Images → Bunny Storage + Pull Zone CDN
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { env } from "@/config/env";
import { BunnyService, BunnyStreamService } from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);
    if (auth.role !== "instructor" && auth.role !== "admin") {
      return errorResponse("Only instructors can upload files", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { filename, folder, type, title } = body as {
      filename: string;
      folder?: string;
      type?: "video" | "image" | "document";
      title?: string;
    };

    if (!filename) {
      return errorResponse("Filename is required", 400);
    }

    // Validate file type
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const videoExts = ["mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv"];
    const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

    const uploadType =
      type ||
      (videoExts.includes(ext)
        ? "video"
        : imageExts.includes(ext)
          ? "image"
          : "document");

    if (uploadType === "video") {
      // ============================================
      // VIDEOS → Bunny Stream
      // ============================================
      if (!BunnyStreamService.isConfigured()) {
        return errorResponse(
          "Bunny Stream is not configured. Set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID.",
          500,
        );
      }

      const created = await BunnyStreamService.createVideo({
        title: title || filename.replace(/\.[^.]+$/, ""),
      });

      if (!created.uploadUrl) {
        return errorResponse("Bunny Stream did not return an upload URL", 500);
      }

      return successResponse(
        {
          uploadUrl: created.uploadUrl,
          storagePath: created.guid,
          videoId: created.guid,
          embedUrl: BunnyStreamService.getEmbedUrl(created.guid),
          hlsUrl: BunnyStreamService.getHlsUrl(created.guid),
          thumbnailUrl: BunnyStreamService.getThumbnailUrl(created.guid),
          headers: {} as Record<string, string>,
          type: uploadType,
        },
        "Direct upload URL generated (Bunny Stream)",
        201,
      );
    } else {
      // ============================================
      // IMAGES → Bunny Storage + Pull Zone CDN
      // ============================================
      let finalFolder = folder;
      if (!finalFolder) {
        if (uploadType === "image") {
          finalFolder = `${env.bunny.defaultFolder || "educational-platform"}/images/${auth.userId}`;
        } else {
          finalFolder = `${env.bunny.defaultFolder || "educational-platform"}/documents/${auth.userId}`;
        }
      }

      const uploadInfo = BunnyService.generateDirectUploadUrl(
        filename,
        finalFolder,
      );

      return successResponse(
        {
          ...uploadInfo,
          cdnUrl: BunnyService.getPublicUrl(uploadInfo.storagePath),
          type: uploadType,
        },
        "Direct upload URL generated (Bunny Storage)",
        201,
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
