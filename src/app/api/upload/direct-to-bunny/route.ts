// ============================================
// 🐰 Direct-to-Bunny Upload API
// ============================================
// Generates a signed upload URL so the browser
// can upload directly to Bunny Storage without
// proxying through the server.
// ============================================

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { env } from "@/config/env";
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
    if (auth.role !== "instructor" && auth.role !== "admin") {
      return errorResponse("Only instructors can upload files", 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse("Invalid JSON body", 400);

    const { filename, folder, type } = body as {
      filename: string;
      folder?: string;
      type?: "video" | "image" | "document";
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

    // Determine folder
    let finalFolder = folder;
    if (!finalFolder) {
      if (uploadType === "video") {
        finalFolder = `${env.bunny.defaultFolder || "educational-platform"}/courses/${auth.userId}`;
      } else if (uploadType === "image") {
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
      "Direct upload URL generated",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
