// ============================================
// 🐰 Bunny CDN URL Helpers
// ============================================
// Utilities for working with Bunny CDN URLs.
// Videos and images are served directly from Bunny's global CDN edge,
// NOT proxied through Vercel/Next.js. This ensures:
//  - Lowest latency (served from nearest PoP)
//  - Zero bandwidth cost on Vercel
//  - No serverless timeout limits
//  - Global edge caching via Bunny's 100+ PoPs
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
 * Convert a Bunny CDN image URL to a local proxy URL.
 * Images are small (~150KB) and proxying them through Vercel avoids
 * Bunny Token Auth issues without significant cost or latency impact.
 * Videos use direct CDN URLs (with token auth) for bandwidth savings.
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
 * Return the original Bunny CDN URL unchanged.
 * Videos are served DIRECTLY from Bunny CDN edge with signed tokens.
 * This ensures lowest latency and zero Vercel bandwidth cost for video.
 *
 * Previously this converted URLs to proxy format:
 *   /api/bunny/video-proxy?path=...
 */
export function toVideoProxyUrl(url: string, _baseUrl?: string): string {
  // Videos use direct CDN URLs (with token auth generated server-side).
  return url;
}

/**
 * Transform a course object's image URLs for delivery.
 * - Cover images & profile pictures → served via proxy (small files,
 *   avoids Token Auth issues without significant cost)
 * - Videos → passed through unchanged (use direct CDN with signed tokens)
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
