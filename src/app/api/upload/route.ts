// src/app/api/upload/route.ts
// Cloudinary Upload API Endpoint

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import CloudinaryService from "@/lib/cloudinary";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

// ============================================
// POST /api/upload - Upload file to Cloudinary
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    // Only instructors and admins can upload
    if (auth.role !== "instructor" && auth.role !== "admin") {
      return errorResponse("Only instructors can upload files", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "video";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate file size
    const maxSize = type === "video" ? 5 * 1024 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse(
        `File too large. Max size: ${type === "video" ? "5GB" : "5MB"}`,
        400,
      );
    }

    // Validate file type
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    let result;
    if (type === "video") {
      result = await CloudinaryService.uploadVideo(buffer, {
        folder: `educational-platform/courses/${auth.userId}`,
      });
    } else {
      result = await CloudinaryService.upload(buffer, {
        folder: `educational-platform/covers/${auth.userId}`,
      });
    }

    console.log(
      `[AUDIT] File uploaded: ${result.publicId} by user ${auth.userId}`,
    );

    return successResponse(
      {
        publicId: result.publicId,
        url: result.secureUrl,
        format: result.format,
        bytes: result.bytes,
        duration: result.duration,
        streamingUrl:
          type === "video"
            ? CloudinaryService.getStreamingUrl(result.publicId)
            : null,
        thumbnail:
          type === "video"
            ? CloudinaryService.getVideoThumbnail(result.publicId)
            : null,
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
// GET /api/upload/signature - Get upload signature
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return errorResponse("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const folder =
      searchParams.get("folder") ||
      `educational-platform/uploads/${auth.userId}`;

    // Return signature for client-side upload
    const signature = CloudinaryService.getUploadSignature({
      folder,
    });

    return successResponse(signature, "Upload signature generated");
  } catch (error) {
    console.error("[SIGNATURE ERROR]", error);
    return handleApiError(error);
  }
}
