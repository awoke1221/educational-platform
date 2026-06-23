// ============================================
// 🐰 Bunny CDN Video Proxy (with HTTP Range support)
// ============================================
// Proxies video files from Bunny Storage through the Next.js server
// to avoid CORS/ORB blocking issues in the browser.
// Supports HTTP Range (byte-serving) so the browser downloads small
// chunks rather than the whole video — avoids Vercel serverless timeouts.
// Uses Storage API directly (with access key) instead of CDN (requires token auth).
// GET /api/bunny/video-proxy?path=... (storage path relative to zone root)
// ============================================

import { NextRequest } from "next/server";
import { errorResponse, handleApiError } from "@/lib/utils/api";
import { env } from "@/config/env";

// Storage API base derived from the raw BUNNY_STORAGE_ZONE env var
const STORAGE_API_BASE = (() => {
  const raw = process.env.BUNNY_STORAGE_ZONE?.trim() || "";
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "https://ny.storage.bunnycdn.com";
  }
})();

export async function GET(request: NextRequest) {
  try {
    const reqUrl = new URL(request.url);
    const storagePath = reqUrl.searchParams.get("path");

    if (!storagePath) {
      return errorResponse("Missing 'path' query parameter", 400);
    }

    // Build the Storage API URL (avoids CDN token auth issues)
    const zoneName = env.bunny.storageZoneName || env.bunny.storageZone;
    if (!zoneName || !env.bunny.accessKey) {
      return errorResponse("Bunny storage not configured", 500);
    }

    const cleaned = storagePath.replace(/^\/+/, "");
    const encoded = cleaned
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/");
    const storageUrl = `${STORAGE_API_BASE}/${encodeURIComponent(zoneName)}/${encoded}`;

    // Forward the Range header from the browser to Bunny Storage
    const rangeHeader = request.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      AccessKey: env.bunny.accessKey,
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    // Fetch from Bunny Storage (may be a range request)
    const storageResponse = await fetch(storageUrl, {
      headers: fetchHeaders,
    });

    if (!storageResponse.ok && storageResponse.status !== 206) {
      const text = await storageResponse.text().catch(() => "");
      return errorResponse(
        `Bunny storage returned ${storageResponse.status}: ${text.substring(0, 200)}`,
        storageResponse.status,
      );
    }

    // Get content type
    const contentType =
      storageResponse.headers.get("content-type") ||
      getMimeType(storagePath) ||
      "video/mp4";

    // Build response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Accept-Ranges", "bytes");
    // Long cache with stale-while-revalidate: serve stale from cache while re-fetching
    responseHeaders.set(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges",
    );

    // Forward range-related headers from Bunny Storage if present
    const contentRange = storageResponse.headers.get("content-range");
    const contentLength = storageResponse.headers.get("content-length");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    return new Response(storageResponse.body, {
      status: rangeHeader ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    // Video types
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m3u8: "application/x-mpegURL",
    ts: "video/MP2T",
    // Image types
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return mimeMap[ext || ""] || "application/octet-stream";
}
