// src/app/api/upload/route.ts
// Cloudinary Upload API Endpoint

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import BunnyService from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// POST /api/upload - Upload file to Bunny Storage
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

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

    if (type === "video" && !allowedVideoTypes.includes(file.type)) {
      return errorResponse(
        "Invalid video format. Allowed: MP4, WebM, OGG",
        400,
      );
    }

    if (type === "image" && !allowedImageTypes.includes(file.type)) {
      return errorResponse(
        "Invalid image format. Allowed: JPEG, PNG, WebP",
        400,
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder =
      type === "video"
        ? `educational-platform/courses/${auth.userId}`
        : `educational-platform/covers/${auth.userId}`;

    const result = await BunnyService.uploadFile(buffer, file.type, {
      folder,
      publicId: `${auth.userId}-${Date.now()}`,
    });

    console.log(
      `[AUDIT] Bunny upload succeeded: ${result.storagePath} by user ${auth.userId}`,
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
      "File uploaded successfully",
      201,
    );
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
        provider: "bunny",
        pullZone: BunnyService.getPublicUrl(""),
      },
      "Upload endpoint available",
    );
  } catch (error) {
    console.error("[UPLOAD METADATA ERROR]", error);
    return handleApiError(error);
  }
}
