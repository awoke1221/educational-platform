// ============================================
// 🐰 Bunny URL Helpers — CDN (images) + Stream (videos)
// ============================================
// Utilities for working with Bunny URLs.
// - Images are served via Bunny Storage + Pull Zone CDN
//   (small files, proxied through Vercel to avoid token auth issues)
// - Videos are served via Bunny Stream HLS
//   (adaptive bitrate streaming, lowest latency)
// ============================================

import { BunnyStreamService } from "./index";

/**
 * Check if a URL is a Bunny CDN URL (for images)
 */
export function isBunnyCdnUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes(".b-cdn.net") ||
      parsed.hostname.includes("bunnycdn")
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a Bunny Stream URL (for videos)
 */
export function isBunnyStreamUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("iframe.mediadelivery.net") ||
      (parsed.hostname.includes(".b-cdn.net") &&
        parsed.pathname.includes("/playlist.m3u8"))
    );
  } catch {
    return false;
  }
}

/**
 * Extract the storage path from a Bunny CDN or Storage URL
 * e.g. "https://educational-platform-images.b-cdn.net/courses/.../image.jpg"
 *   → "educational-platform/covers/.../image.png"
 */
export function extractBunnyStoragePath(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Strip leading slash
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

/**
 * Extract the Bunny Stream video ID from a Stream URL
 */
export function extractBunnyStreamId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // From embed URL: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
    const embedMatch = parsed.pathname.match(/\/embed\/[^/]+\/([^/]+)/);
    if (embedMatch) return embedMatch[1];
    // From HLS URL: https://{cdn}.b-cdn.net/{videoId}/playlist.m3u8
    const hlsMatch = parsed.pathname.match(/\/([^/]+)\/playlist\.m3u8/);
    if (hlsMatch) return hlsMatch[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert a Bunny CDN image URL to a local proxy URL.
 * Images are small (~150KB) and proxying them through Vercel avoids
 * Bunny Token Auth issues without significant cost or latency impact.
 * Videos use Bunny Stream HLS for bandwidth savings.
 *
 * Returns the original URL if it's not a Bunny CDN URL.
 */
export function toImageProxyUrl(url: string, baseUrl?: string): string {
  if (!url || !isBunnyCdnUrl(url)) return url;

  const path = extractBunnyStoragePath(url);
  if (!path) return url;

  const encodedPath = encodeURIComponent(path);
  if (baseUrl) {
    return `${baseUrl}/api/bunny/video-proxy?path=${encodedPath}`;
  }
  return `/api/bunny/video-proxy?path=${encodedPath}`;
}

/**
 * Return the Bunny Stream HLS URL for a video.
 * Videos are served via Bunny Stream HLS (adaptive bitrate streaming).
 * This ensures lowest latency, auto-quality switching, and zero Vercel bandwidth cost.
 */
export function toVideoStreamUrl(videoId: string): string {
  return BunnyStreamService.getHlsUrl(videoId);
}

/**
 * Transform a course object's image URLs for delivery.
 * - Cover images & profile pictures → served via proxy (small files,
 *   avoids Token Auth issues without significant cost)
 * - Videos → passed through unchanged (use direct Stream HLS URLs)
 */
export function proxifyCourse<
  T extends {
    coverImage?: string;
    instructor?: { profileImage?: string } | null;
  },
>(course: T, baseUrl?: string): T {
  if (!course) return course;

  const result = { ...course };

  // Proxy cover image (small file, avoids Token Auth complexity)
  if ((result as any).coverImage) {
    (result as any).coverImage = toImageProxyUrl(
      (result as any).coverImage,
      baseUrl,
    );
  }

  // Proxy instructor profile image (small file)
  if (result.instructor && result.instructor.profileImage) {
    result.instructor = {
      ...result.instructor,
      profileImage: toImageProxyUrl(result.instructor.profileImage, baseUrl),
    };
  }

  return result;
}
