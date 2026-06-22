// ============================================
// 🎥 AD LMS Service Worker — Video Cache-First
// ============================================
// This service worker intercepts video fetch requests
// and serves them from the Cache Storage API first (cache-first).
// If not cached, it fetches from network and stores the response.
// This means videos play instantly on repeat visits.
// ============================================

const CACHE_NAME = "adlms-video-cache-v1";
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB

// Video URL patterns to intercept
const VIDEO_PATTERNS = [
  /\.b-cdn\.net\//i,
  /\.bunnycdn\.com\//i,
  /\/api\/bunny\/video-proxy\//i,
];

// ============================================
// Install — pre-cache nothing, just take over
// ============================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ============================================
// Activate — clean up old caches
// ============================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith("adlms-"))
          .map((name) => caches.delete(name)),
      );
    }),
  );
});

// ============================================
// Fetch — Cache-First strategy for videos
// ============================================

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Only intercept video URLs
  if (!isVideoUrl(url)) return;

  event.respondWith(cacheFirst(event.request));
});

// ============================================
// Check if URL matches video patterns
// ============================================

function isVideoUrl(url) {
  try {
    return VIDEO_PATTERNS.some((pattern) => pattern.test(url));
  } catch {
    return false;
  }
}

// ============================================
// Cache-First Strategy
// ============================================

async function cacheFirst(request) {
  try {
    // 1. Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 2. Not in cache — fetch from network
    const networkResponse = await fetch(request);

    // 3. Only cache successful video responses (not range responses)
    if (networkResponse.ok || networkResponse.status === 206) {
      const cache = await caches.open(CACHE_NAME);
      // Clone because response can only be consumed once
      cache.put(request, networkResponse.clone());

      // 4. Enforce cache size limits (fire-and-forget)
      trimCache();
    }

    return networkResponse;
  } catch (error) {
    // If network fails and we have nothing cached, return error
    console.error("[SW] Video fetch failed:", error);
    throw error;
  }
}

// ============================================
// Enforce cache size limits
// ============================================

async function trimCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    if (keys.length === 0) return;

    let totalSize = 0;
    const entries = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (!response) continue;

      const contentLength = response.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      const date = response.headers.get("date")
        ? new Date(response.headers.get("date")).getTime()
        : Date.now();

      entries.push({ request, size, date });
      totalSize += size;
    }

    // If under limit, nothing to do
    if (totalSize <= MAX_CACHE_SIZE) return;

    // Sort by date (oldest first) and remove until under limit
    entries.sort((a, b) => a.date - b.date);

    for (const entry of entries) {
      if (totalSize <= MAX_CACHE_SIZE) break;
      await cache.delete(entry.request);
      totalSize -= entry.size;
    }
  } catch (e) {
    // Silently fail
  }
}
