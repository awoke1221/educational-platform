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

    // 1. Prefer the configured trailer video ID, then fall back to the legacy hero video ID.
    const videoId =
      providedVideoId ||
      env.bunnyStream.trailerVideoId?.trim() ||
      env.bunnyStream.fallbackHeroVideoId?.trim();

    if (videoId) {
      const embedUrl = BunnyStreamService.getEmbedUrl(videoId);
      const hlsUrl = BunnyStreamService.getHlsUrl(videoId);
      const thumbnailUrl = BunnyStreamService.getThumbnailUrl(videoId);

      if (embedUrl) {
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
    }

    // 3. No hero video configured
    return successResponse(null, "No hero video available", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
