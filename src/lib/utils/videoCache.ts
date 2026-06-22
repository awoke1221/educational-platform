// ============================================
// 🎥 Video Cache Service
// ============================================
// Uses Cache Storage API for cache-first video delivery.
// Videos are stored in the browser cache after first load,
// so subsequent plays load instantly without network requests.
// ============================================

const CACHE_NAME = "adlms-video-cache-v1";
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB max cache
const VIDEO_URL_PATTERNS = [
  /\.b-cdn\.net\//i,
  /\.bunnycdn\.com\//i,
  /\/api\/bunny\/video-proxy\//i,
];

// ============================================
// Check if Cache API is available
// ============================================

export function isCacheAvailable(): boolean {
  return typeof caches !== "undefined" && "caches" in window;
}

// ============================================
// Check if a URL is a video URL we can cache
// ============================================

export function isVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return VIDEO_URL_PATTERNS.some((pattern) => pattern.test(parsed.href));
  } catch {
    return false;
  }
}

// ============================================
// Open the video cache
// ============================================

async function openCache(): Promise<Cache> {
  return caches.open(CACHE_NAME);
}

// ============================================
// Get a cached video response
// ============================================

export async function getCachedVideo(
  url: string,
): Promise<Response | undefined> {
  if (!isCacheAvailable()) return undefined;
  try {
    const cache = await openCache();
    return await cache.match(url);
  } catch {
    return undefined;
  }
}

// ============================================
// Store a video response in the cache
// ============================================

export async function cacheVideoResponse(
  url: string,
  response: Response,
): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await openCache();

    // Clone the response since it can only be consumed once
    const clone = response.clone();

    // Store in cache
    await cache.put(url, clone);

    // Enforce cache size limits
    await trimCache();
  } catch (err) {
    console.warn("[VideoCache] Failed to cache video:", err);
  }
}

// ============================================
// Preload a video into cache (background fetch)
// ============================================

export async function preloadVideo(url: string): Promise<void> {
  if (!isCacheAvailable() || !url || !isVideoUrl(url)) return;

  // Check if already cached
  const cached = await getCachedVideo(url);
  if (cached) return; // Already cached

  try {
    // Fetch with range=bytes=0-1MB to get initial segment only
    const response = await fetch(url, {
      headers: {
        Range: "bytes=0-1048576", // First 1MB for instant start
      },
    });

    if (response.ok) {
      await cacheVideoResponse(url, response);
    }
  } catch {
    // Silently fail — preloading is opportunistic
  }
}

// ============================================
// Prefetch the full video into cache
// ============================================

export async function prefetchFullVideo(url: string): Promise<void> {
  if (!isCacheAvailable() || !url || !isVideoUrl(url)) return;

  const cached = await getCachedVideo(url);
  if (cached) return;

  try {
    // Use the video-proxy with full range or direct CDN
    const response = await fetch(url, {
      // Only prefetch if browser has idle time
      priority: "low",
    });

    if (response.ok) {
      await cacheVideoResponse(url, response);
    }
  } catch {
    // Silently fail
  }
}

// ============================================
// Remove a specific video from cache
// ============================================

export async function removeCachedVideo(url: string): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await openCache();
    await cache.delete(url);
  } catch {
    // ignore
  }
}

// ============================================
// Clear all cached videos
// ============================================

export async function clearVideoCache(): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    // ignore
  }
}

// ============================================
// Get cache storage estimate
// ============================================

export async function getCacheInfo(): Promise<{
  used: number;
  max: number;
  entries: number;
}> {
  if (!isCacheAvailable()) {
    return { used: 0, max: MAX_CACHE_SIZE, entries: 0 };
  }

  try {
    const cache = await openCache();
    const keys = await cache.keys();
    let totalSize = 0;

    // Estimate size by reading each response
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          totalSize += parseInt(contentLength, 10);
        }
      }
    }

    return {
      used: totalSize,
      max: MAX_CACHE_SIZE,
      entries: keys.length,
    };
  } catch {
    return { used: 0, max: MAX_CACHE_SIZE, entries: 0 };
  }
}

// ============================================
// Enforce cache size limits (evict oldest entries)
// ============================================

async function trimCache(): Promise<void> {
  try {
    const cache = await openCache();
    const keys = await cache.keys();

    if (keys.length === 0) return;

    let totalSize = 0;
    const entries: { url: string; size: number; date: number }[] = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (!response) continue;

      const contentLength = response.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      const date = response.headers.get("date")
        ? new Date(response.headers.get("date")!).getTime()
        : Date.now();

      entries.push({ url: request.url, size, date });
      totalSize += size;
    }

    // If under limit, nothing to do
    if (totalSize <= MAX_CACHE_SIZE) return;

    // Sort by date (oldest first) and remove until under limit
    entries.sort((a, b) => a.date - b.date);

    for (const entry of entries) {
      if (totalSize <= MAX_CACHE_SIZE) break;
      await cache.delete(entry.url);
      totalSize -= entry.size;
    }
  } catch {
    // Silently fail on cache trim
  }
}
