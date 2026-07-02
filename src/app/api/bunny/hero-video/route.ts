import { env } from "@/config/env";
import { BunnyStreamService } from "@/lib/bunny";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/utils/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const providedVideoId = url.searchParams.get("videoId");

    // ============================================
    // 🐰 Bunny Stream — Hero video via Stream API
    // ============================================

    // 1. Check for fallback hero video ID from env
    const fallbackId = env.bunnyStream.fallbackHeroVideoId?.trim();

    // 2. Use provided videoId or fallback
    const videoId = providedVideoId || fallbackId;

    if (videoId && BunnyStreamService.isConfigured()) {
      const hlsUrl = BunnyStreamService.getHlsUrl(videoId);
      const embedUrl = BunnyStreamService.getEmbedUrl(videoId);
      const thumbnailUrl = BunnyStreamService.getThumbnailUrl(videoId);

      return successResponse(
        {
          videoUrl: hlsUrl,
          hlsUrl,
          embedUrl,
          poster: thumbnailUrl,
          thumbnailUrl,
          filename: "hero-video",
          type: "m3u8",
          videoId,
          storagePath: videoId,
        },
        "Hero video retrieved successfully (Bunny Stream)",
      );
    }

    // 3. No hero video configured
    return successResponse(null, "No hero video available", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
