// ============================================
// 🐰 Bunny CDN URL Helpers
// ============================================
// Centralized utilities for converting Bunny CDN URLs
// to local proxy URLs to avoid CORS/ORB blocking.
// ============================================

/**
 * Check if a URL is a Bunny CDN URL
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
 * Extract the storage path from a Bunny CDN or Storage URL
 * e.g. "https://adonaytiktokacadamy.b-cdn.net/educational-platform/covers/.../image.png"
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
 * Convert a Bunny CDN URL to a local image proxy URL.
 * Uses the video-proxy endpoint (which handles all file types) to avoid
 * CORS/ORB blocking issues (ERR_BLOCKED_BY_ORB) in the browser.
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
 * Convert a Bunny CDN URL to a local video proxy URL.
 * Returns the original URL if it's not a Bunny CDN URL.
 */
export function toVideoProxyUrl(url: string, baseUrl?: string): string {
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
 * Proxify a course object: converts all Bunny CDN URLs in coverImage
 * and instructor profileImage to use local proxy endpoints.
 */
export function proxifyCourse<
  T extends {
    coverImage?: string;
    instructor?: { profileImage?: string } | null;
  },
>(course: T, baseUrl?: string): T {
  if (!course) return course;

  const result = { ...course };

  // Proxy cover image
  if ((result as any).coverImage) {
    (result as any).coverImage = toImageProxyUrl(
      (result as any).coverImage,
      baseUrl,
    );
  }

  // Proxy instructor profile image
  if (result.instructor && result.instructor.profileImage) {
    result.instructor = {
      ...result.instructor,
      profileImage: toImageProxyUrl(result.instructor.profileImage, baseUrl),
    };
  }

  return result;
}
