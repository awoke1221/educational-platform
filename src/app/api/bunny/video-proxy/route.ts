// ============================================
// 🐰 Bunny CDN Video Proxy
// ============================================
// Proxies video files from Bunny Storage through the Next.js server
// to avoid CORS/ORB blocking issues in the browser.
// Uses Storage API directly (with access key) instead of CDN (which requires token auth).
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

    // Fetch the video from Bunny Storage with the access key
    const storageResponse = await fetch(storageUrl, {
      headers: { AccessKey: env.bunny.accessKey },
    });

    if (!storageResponse.ok) {
      const text = await storageResponse.text().catch(() => "");
      return errorResponse(
        `Bunny storage returned ${storageResponse.status}: ${text.substring(0, 200)}`,
        storageResponse.status,
      );
    }

    // Get the content type from the response or infer from extension
    const contentType =
      storageResponse.headers.get("content-type") ||
      getMimeType(storagePath) ||
      "video/mp4";

    // Stream the response with proper headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");
    // Allow cross-origin usage
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(storageResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m3u8: "application/x-mpegURL",
    ts: "video/MP2T",
  };
  return mimeMap[ext || ""] || "video/mp4";
}
