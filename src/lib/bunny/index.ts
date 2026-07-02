// ============================================
// 🐰 Bunny.net Services — Storage (images) + Stream (videos)
// ============================================
// Features:
// - Full Storage API (upload, download, delete, list, info) — IMAGES ONLY
// - Pull Zone management (purge cache, statistics)
// - Token-authenticated signed URLs
// - ✅ Bunny Stream API (video upload, transcoding, HLS playback)
// - Direct upload URL generation (browser → Bunny)
// - Bulk operations
// ============================================
//
// Migration Note (July 2026):
//   Videos now use Bunny Stream (HLS adaptive bitrate streaming).
//   The old Bunny Storage + Pull Zone is kept for images only.
//   See: https://docs.bunny.net/docs/stream-introduction
// ============================================

import { env } from "@/config/env";
import crypto from "node:crypto";

// ============================================
// Types — Bunny Storage (images)
// ============================================

export interface BunnyUploadOptions {
  folder?: string;
  publicId?: string;
  mimeType?: string;
  overwrite?: boolean;
  /** If true, uses Checksum header for integrity verification */
  checksum?: boolean;
}

export interface BunnyUploadResult {
  storagePath: string;
  url: string;
  cdnUrl: string;
  bytes: number;
  mimeType: string;
  filename: string;
  checksum?: string;
}

export interface BunnyFileInfo {
  guid: string;
  storageZoneName: string;
  path: string;
  objectName: string;
  length: number;
  lastChanged: string;
  serverId: number;
  arrayNumber: number;
  isDirectory: boolean;
  contentType: string;
  dateCreated: string;
  storageZoneId: number;
  checksum?: string;
  replicaLocations: string[];
}

export interface BunnyPurgeResult {
  status: number;
  nodeId?: string;
  message?: string;
}

export interface BunnyStatistics {
  totalBandwidthUsed: number;
  totalRequestsServed: number;
  cacheHitRate: number;
  totalStorageUsed: number;
}

// ============================================
// Types — Bunny Stream (videos)
// ============================================

/** Response from creating a video in Bunny Stream */
export interface BunnyStreamCreateVideoResult {
  guid: string;
  uploadUrl: string | null;
  title: string;
  status: string;
  libraryId: number;
}

/** Full video object from Bunny Stream API */
export interface BunnyStreamVideo {
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number;
  framerate: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  captions: any[];
  moments: any[];
  metaTags: any[];
  chapters: any[];
  videoLibraryId: number;
}

/** Upload options for Bunny Stream */
export interface BunnyStreamUploadOptions {
  title?: string;
  collectionId?: string;
  /** If true, creates video and returns upload URL without uploading */
  directUploadUrl?: boolean;
}

// ============================================
// Constants
// ============================================

/** Derive the region-specific storage endpoint from the configured storage zone URL */
function getStorageApiBase(): string {
  const storageUrl = process.env.BUNNY_STORAGE_ZONE?.trim() || "";
  if (storageUrl) {
    try {
      const url = new URL(storageUrl);
      return `${url.protocol}//${url.hostname}`;
    } catch {
      /* fall through */
    }
  }
  return "https://storage.bunnycdn.com";
}

const STORAGE_API_BASE = getStorageApiBase();
const API_BASE = env.bunny.apiUrl || "https://api.bunny.net";
const PULL_ZONE_URL = env.bunny.pullZoneUrl.replace(/\/+$/, "");

// ============================================
// Helpers
// ============================================

function normalizePath(value: string): string {
  return value
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\/\-\s]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+$/, "");
}

function getStorageZoneName(): string {
  return env.bunny.storageZoneName || env.bunny.storageZone;
}

function buildStorageEndpoint(path: string): string {
  const storageZone = getStorageZoneName();
  if (!storageZone) throw new Error("Bunny storage zone is not configured");
  const cleaned = path.replace(/^\/+/, "");
  const encoded = cleaned
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${STORAGE_API_BASE}/${encodeURIComponent(storageZone)}/${encoded}`;
}

function buildApiEndpoint(path: string): string {
  return `${API_BASE}/${path.replace(/^\//, "")}`;
}

function getAuthHeaders(): Record<string, string> {
  return { AccessKey: env.bunny.accessKey };
}

function getApiAuthHeaders(): Record<string, string> {
  return {
    accept: "application/json",
    ...(env.bunny.accessKey
      ? { AccessKey: env.bunny.accessKey }
      : { "x-api-key": env.bunny.accessKey }),
  };
}

function computeChecksum(data: Buffer | ArrayBuffer): string {
  const buf = data instanceof Buffer ? data : Buffer.from(new Uint8Array(data));
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// ============================================
// Main Bunny Service
// ============================================

export class BunnyService {
  // ============================================
  // 1. STORAGE OPERATIONS
  // ============================================

  /**
   * Upload a file to Bunny Storage
   * Supports Buffer, string, or ArrayBuffer data
   */
  static async uploadFile(
    file: string | Buffer | ArrayBuffer,
    mimeType: string,
    options: BunnyUploadOptions = {},
  ): Promise<BunnyUploadResult> {
    if (!env.bunny.accessKey || !getStorageZoneName()) {
      throw new Error(
        "Bunny storage is not configured. Set BUNNY_ACCESS_KEY and BUNNY_STORAGE_ZONE.",
      );
    }

    const folder = (
      options.folder ||
      env.bunny.defaultFolder ||
      "educational-platform"
    ).replace(/^\/+|\/+$/g, "");

    const filename = options.publicId
      ? normalizePath(options.publicId)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const extMap: Record<string, string> = {
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/ogg": ".ogv",
      "video/quicktime": ".mov",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const ext = extMap[mimeType] || "";
    const finalFilename = filename.endsWith(ext) ? filename : filename + ext;

    const storagePath = `${folder}/${finalFilename}`.replace(/\/+/g, "/");

    let body: BodyInit;
    let checksum: string | undefined;

    if (typeof file === "string") {
      body = file;
      if (options.checksum) {
        checksum = crypto.createHash("sha256").update(file).digest("hex");
      }
    } else {
      const binaryData =
        file instanceof Buffer ? new Uint8Array(file) : new Uint8Array(file);
      body = binaryData;
      if (options.checksum) {
        checksum = computeChecksum(Buffer.from(binaryData));
      }
    }

    const headers: Record<string, string> = {
      AccessKey: env.bunny.accessKey,
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (checksum) {
      headers["Checksum"] = checksum;
    }

    const endpoint = buildStorageEndpoint(storagePath);

    const response = await fetch(endpoint, {
      method: "PUT",
      headers,
      body,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "Unknown error");
      const error = new Error(
        `Bunny storage upload failed (${response.status}): ${message}`,
      );
      if (response.status === 401) {
        error.message +=
          " - Verify your Bunny storage access key and storage zone configuration.";
      }
      if (response.status === 400) {
        error.message +=
          " - The file may already exist. Set overwrite option or use a different filename.";
      }
      throw error;
    }

    return {
      storagePath,
      url: this.getPublicUrl(storagePath),
      cdnUrl: this.getPublicUrl(storagePath),
      bytes:
        typeof file === "string"
          ? Buffer.byteLength(file)
          : file instanceof Buffer
            ? file.length
            : file.byteLength,
      mimeType,
      filename: finalFilename,
      checksum,
    };
  }

  /**
   * Upload a video file with proper folder structure
   */
  static async uploadVideo(
    file: string | Buffer | ArrayBuffer,
    mimeType: string,
    options: BunnyUploadOptions = {},
  ): Promise<BunnyUploadResult> {
    return this.uploadFile(file, mimeType, {
      ...options,
      folder:
        options.folder ||
        `${env.bunny.defaultFolder || "educational-platform"}/courses`,
    });
  }

  /**
   * Upload an image file with proper folder structure
   */
  static async uploadImage(
    file: string | Buffer | ArrayBuffer,
    mimeType: string,
    options: BunnyUploadOptions = {},
  ): Promise<BunnyUploadResult> {
    return this.uploadFile(file, mimeType, {
      ...options,
      folder:
        options.folder ||
        `${env.bunny.defaultFolder || "educational-platform"}/images`,
    });
  }

  /**
   * Delete a file from Bunny Storage
   */
  static async deleteFile(storagePath: string): Promise<boolean> {
    if (!env.bunny.accessKey || !getStorageZoneName()) return false;

    const response = await fetch(buildStorageEndpoint(storagePath), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[Bunny] Delete failed (${response.status}): ${text}`);
      return false;
    }
    return true;
  }

  /**
   * Delete multiple files at once
   */
  static async deleteFiles(storagePaths: string[]): Promise<{
    succeeded: number;
    failed: number;
    errors: { path: string; error: string }[];
  }> {
    const results = await Promise.allSettled(
      storagePaths.map(async (path) => {
        const ok = await this.deleteFile(path);
        if (!ok) throw new Error(`Failed to delete: ${path}`);
        return path;
      }),
    );

    const succeeded: string[] = [];
    const errors: { path: string; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        succeeded.push(result.value);
      } else {
        errors.push({
          path: storagePaths[index],
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    return { succeeded: succeeded.length, failed: errors.length, errors };
  }

  /**
   * List files in a storage directory
   */
  static async listFiles(path: string = ""): Promise<BunnyFileInfo[]> {
    if (!env.bunny.accessKey)
      throw new Error("Bunny access key not configured");

    // Don't use normalizePath here — it replaces spaces with dashes,
    // but Bunny Storage supports spaces in folder/file names.
    // The buildStorageEndpoint function handles URL-encoding correctly.
    const cleaned = path.replace(/^\/+/, "");
    const endpoint = buildStorageEndpoint(cleaned);
    const response = await fetch(`${endpoint}/`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Bunny list failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data?.items || [];
  }

  /**
   * Get file info/metadata
   */
  static async getFileInfo(storagePath: string): Promise<BunnyFileInfo | null> {
    try {
      const files = await this.listFiles(
        storagePath.split("/").slice(0, -1).join("/"),
      );
      const filename = storagePath.split("/").pop();
      return files.find((f) => f.objectName === filename) || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a file exists in storage
   */
  static async fileExists(storagePath: string): Promise<boolean> {
    const info = await this.getFileInfo(storagePath);
    return info !== null && !info.isDirectory;
  }

  /**
   * Create a folder/directory in Bunny Storage
   */
  static async createFolder(folderPath: string): Promise<boolean> {
    const endpoint = buildStorageEndpoint(`${normalizePath(folderPath)}/`);
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[Bunny] Create folder failed (${response.status}): ${text}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStatistics(): Promise<BunnyStatistics> {
    const storageZoneName = getStorageZoneName();
    const endpoint = buildApiEndpoint(
      `storagezone/${encodeURIComponent(storageZoneName)}`,
    );
    const response = await fetch(endpoint, {
      headers: getApiAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch storage statistics");

    const data = await response.json();
    return {
      totalBandwidthUsed: data.TotalBandwidthUsed || 0,
      totalRequestsServed: data.TotalRequestsServed || 0,
      cacheHitRate: data.CacheHitRate || 0,
      totalStorageUsed: data.StorageUsed || 0,
    };
  }

  // ============================================
  // 2. CDN / PULL ZONE OPERATIONS
  // ============================================

  /**
   * Get the public CDN URL for a storage path
   */
  static getPublicUrl(storagePath: string): string {
    if (!PULL_ZONE_URL) {
      throw new Error("Bunny Pull Zone URL is not configured");
    }
    // Preserve the original storage path with spaces (Bunny stores files with spaces).
    // Only strip leading slash and URL-encode each segment individually.
    const cleaned = storagePath.replace(/^\/+/, "");
    const encoded = cleaned
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/");
    const base = PULL_ZONE_URL.endsWith("/")
      ? PULL_ZONE_URL
      : `${PULL_ZONE_URL}/`;
    return `${base}${encoded}`;
  }

  // (Video methods removed — videos now use BunnyStreamService instead)

  /**
   * Purge a single file from the CDN cache
   */
  static async purgeFile(url: string): Promise<BunnyPurgeResult> {
    const endpoint = buildApiEndpoint("purge");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getApiAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      nodeId: data.NodeId,
      message: response.ok ? "Cache purged successfully" : data.Message,
    };
  }

  /**
   * Purge multiple files from the CDN cache
   */
  static async purgeFiles(urls: string[]): Promise<BunnyPurgeResult[]> {
    return Promise.all(urls.map((url) => this.purgeFile(url)));
  }

  /**
   * Purge entire Pull Zone cache
   */
  static async purgePullZone(): Promise<BunnyPurgeResult> {
    if (!env.bunny.pullZoneId) {
      throw new Error(
        "Pull Zone ID is required for cache purge. Set BUNNY_PULL_ZONE_ID.",
      );
    }

    const endpoint = buildApiEndpoint(
      `pullzone/${encodeURIComponent(env.bunny.pullZoneId)}/purgeCache`,
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getApiAuthHeaders(),
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      message: response.ok
        ? "Pull Zone cache purged successfully"
        : data.Message,
    };
  }

  /**
   * Get Pull Zone statistics
   */
  static async getPullZoneStatistics(): Promise<BunnyStatistics> {
    if (!env.bunny.pullZoneId) {
      throw new Error("Pull Zone ID is required. Set BUNNY_PULL_ZONE_ID.");
    }

    const endpoint = buildApiEndpoint(
      `pullzone/${encodeURIComponent(env.bunny.pullZoneId)}/statistics`,
    );
    const response = await fetch(endpoint, {
      headers: getApiAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch Pull Zone statistics");

    const data = await response.json();
    return {
      totalBandwidthUsed: data.TotalBandwidthUsed || 0,
      totalRequestsServed: data.TotalRequestsServed || 0,
      cacheHitRate: data.CacheHitRate || 0,
      totalStorageUsed: data.TotalStorageUsed || 0,
    };
  }

  // ============================================
  // 3. DIRECT UPLOAD (Browser to Bunny Storage — images only)
  // ============================================

  /**
   * Generate a signed upload URL for direct browser-to-Bunny uploads.
   * This allows users to upload videos directly without proxying through your server.
   */
  static generateDirectUploadUrl(
    filename: string,
    folder?: string,
  ): {
    uploadUrl: string;
    storagePath: string;
    headers: Record<string, string>;
  } {
    const finalFolder = (
      folder || `${env.bunny.defaultFolder || "educational-platform"}/courses`
    ).replace(/^\/+|\/+$/g, "");

    const normalizedFilename = normalizePath(filename);
    const storagePath = `${finalFolder}/${normalizedFilename}`;
    const endpoint = buildStorageEndpoint(storagePath);

    return {
      uploadUrl: endpoint,
      storagePath,
      headers: {
        AccessKey: env.bunny.accessKey,
      },
    };
  }

  // ============================================
  // 6. UTILITY METHODS
  // ============================================

  /**
   * Build the storage path for a course cover image
   */
  static getCourseCoverPath(courseId: string, filename: string): string {
    const folder = env.bunny.defaultFolder || "educational-platform";
    return `${folder}/courses/${courseId}/cover/${normalizePath(filename)}`;
  }

  /**
   * Build the storage path for a user profile image
   */
  static getProfileImagePath(userId: string, filename: string): string {
    const folder = env.bunny.defaultFolder || "educational-platform";
    return `${folder}/profiles/${userId}/${normalizePath(filename)}`;
  }

  /**
   * Extract the storage path from a CDN URL
   */
  static extractStoragePathFromUrl(cdnUrl: string): string | null {
    if (!PULL_ZONE_URL) return null;

    try {
      const cdnOrigin = new URL(PULL_ZONE_URL).origin;
      const urlObj = new URL(cdnUrl);

      if (urlObj.origin !== cdnOrigin) return null;

      return urlObj.pathname.replace(/^\//, "");
    } catch {
      return null;
    }
  }

  /**
   * Convert file size to human-readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  }

  /**
   * Validate if an image file can be uploaded to Bunny Storage
   */
  static validateImageUpload(file: { type: string; size: number }): {
    valid: boolean;
    error?: string;
  } {
    if (!env.bunny.allowedImageTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid image format. Allowed: JPEG, PNG, WebP, GIF, AVIF`,
      };
    }
    if (file.size > env.bunny.maxFileSize) {
      return {
        valid: false,
        error: `Image too large. Maximum size: ${this.formatFileSize(env.bunny.maxFileSize)}`,
      };
    }
    return { valid: true };
  }

  /**
   * Health check - verify Bunny credentials and connectivity
   */
  static async healthCheck(): Promise<{
    ok: boolean;
    storageZone: string;
    pullZoneConfigured: boolean;
    message: string;
  }> {
    try {
      const storageZoneName = getStorageZoneName();
      const hasAccessKey = !!env.bunny.accessKey;
      const pullZoneConfigured = !!PULL_ZONE_URL;

      if (!hasAccessKey || !storageZoneName) {
        return {
          ok: false,
          storageZone: storageZoneName || "not configured",
          pullZoneConfigured,
          message: "Bunny is not fully configured",
        };
      }

      const files = await this.listFiles("");
      return {
        ok: true,
        storageZone: storageZoneName,
        pullZoneConfigured,
        message: `Bunny connected. Storage zone: ${storageZoneName}, Files: ${files.length}`,
      };
    } catch (error: any) {
      return {
        ok: false,
        storageZone: getStorageZoneName(),
        pullZoneConfigured: !!PULL_ZONE_URL,
        message: `Bunny connection failed: ${error.message}`,
      };
    }
  }
}

// ============================================
// 🐰 Bunny Stream Service (for VIDEOS)
// ============================================
// Bunny Stream handles video ingestion, transcoding to
// multiple qualities (HLS), thumbnails, and analytics.
//
// API Docs: https://docs.bunny.net/reference/bunny-stream-api
// ============================================

export class BunnyStreamService {
  private static getApiBase(): string {
    const hostname = env.bunnyStream.hostname || "video.bunnycdn.com";
    const libraryId = env.bunnyStream.libraryId;
    if (!libraryId)
      throw new Error(
        "Bunny Stream library ID is not configured. Set BUNNY_STREAM_LIBRARY_ID.",
      );
    return `https://${hostname}/library/${libraryId}`;
  }

  private static getApiKey(): string {
    const key = env.bunnyStream.apiKey;
    if (!key)
      throw new Error(
        "Bunny Stream API key is not configured. Set BUNNY_STREAM_API_KEY.",
      );
    return key;
  }

  private static getHeaders(): Record<string, string> {
    return {
      accept: "application/json",
      "content-type": "application/json",
      AccessKey: this.getApiKey(),
    };
  }

  /**
   * Get the embed URL for a Bunny Stream video
   * e.g. https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
   */
  static getEmbedUrl(videoId: string): string {
    const libraryId = env.bunnyStream.libraryId;
    if (!libraryId || !videoId) return "";
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
  }

  /**
   * Get the HLS playlist URL for a Bunny Stream video
   * e.g. https://{cdn-host}.b-cdn.net/{videoId}/playlist.m3u8
   */
  static getHlsUrl(videoId: string): string {
    if (!videoId) return "";
    const cdnHost = env.bunnyStream.cdnHostname;
    if (cdnHost) {
      return `https://${cdnHost}.b-cdn.net/${videoId}/playlist.m3u8`;
    }
    // Default: use iframe.mediadelivery.net
    const libraryId = env.bunnyStream.libraryId;
    if (libraryId) {
      return `https://iframe.mediadelivery.net/${libraryId}/${videoId}/playlist.m3u8`;
    }
    return "";
  }

  /**
   * Get the thumbnail URL for a Bunny Stream video
   */
  static getThumbnailUrl(videoId: string): string {
    if (!videoId) return "";
    const cdnHost = env.bunnyStream.cdnHostname;
    if (cdnHost) {
      return `https://${cdnHost}.b-cdn.net/${videoId}/thumbnail.jpg`;
    }
    // Default fallback
    const libraryId = env.bunnyStream.libraryId;
    if (libraryId) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}/thumbnail.jpg`;
    }
    return "";
  }

  /**
   * Create a video in Bunny Stream and get an upload URL.
   * This is the first step — after getting the uploadUrl, you PUT the file there.
   *
   * POST /library/{libraryId}/videos
   */
  static async createVideo(
    options: BunnyStreamUploadOptions = {},
  ): Promise<BunnyStreamCreateVideoResult> {
    const endpoint = `${this.getApiBase()}/videos`;
    const body: Record<string, any> = {
      title: options.title || `Lecture-${Date.now()}`,
    };
    if (options.collectionId) body.collectionId = options.collectionId;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Bunny Stream create video failed (${response.status}): ${text}`,
      );
    }

    return response.json();
  }

  /**
   * Upload a video file to Bunny Stream using the upload URL
   * obtained from createVideo().
   *
   * PUT {uploadUrl}
   */
  static async uploadVideoFile(
    uploadUrl: string,
    file: Buffer | ArrayBuffer | Blob,
    mimeType: string = "video/mp4",
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": mimeType,
    };

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file instanceof Blob ? file : new Blob([file], { type: mimeType }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Bunny Stream upload failed (${response.status}): ${text}`,
      );
    }
  }

  /**
   * Full flow: Create video + upload file in one call.
   * Returns the video GUID (bunnyStreamId) and URLs.
   */
  static async createAndUploadVideo(
    file: Buffer | ArrayBuffer,
    mimeType: string,
    title?: string,
  ): Promise<{
    videoId: string;
    embedUrl: string;
    hlsUrl: string;
    thumbnailUrl: string;
  }> {
    // Step 1: Create video entry
    const created = await this.createVideo({ title });

    if (!created.uploadUrl) {
      throw new Error("Bunny Stream did not return an upload URL");
    }

    // Step 2: Upload the file to the provided upload URL
    await this.uploadVideoFile(created.uploadUrl, file, mimeType);

    return {
      videoId: created.guid,
      embedUrl: this.getEmbedUrl(created.guid),
      hlsUrl: this.getHlsUrl(created.guid),
      thumbnailUrl: this.getThumbnailUrl(created.guid),
    };
  }

  /**
   * Fetch video details from Bunny Stream
   *
   * GET /library/{libraryId}/videos/{videoId}
   */
  static async getVideo(videoId: string): Promise<BunnyStreamVideo> {
    const endpoint = `${this.getApiBase()}/videos/${videoId}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Bunny Stream get video failed (${response.status}): ${text}`,
      );
    }

    return response.json();
  }

  /**
   * List videos in the library
   *
   * GET /library/{libraryId}/videos
   */
  static async listVideos(
    page: number = 1,
    perPage: number = 100,
  ): Promise<{
    items: BunnyStreamVideo[];
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
  }> {
    const endpoint = `${this.getApiBase()}/videos?page=${page}&itemsPerPage=${perPage}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Bunny Stream list videos failed (${response.status}): ${text}`,
      );
    }

    return response.json();
  }

  /**
   * Delete a video from Bunny Stream
   *
   * DELETE /library/{libraryId}/videos/{videoId}
   */
  static async deleteVideo(videoId: string): Promise<boolean> {
    const endpoint = `${this.getApiBase()}/videos/${videoId}`;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[BunnyStream] Delete failed (${response.status}): ${text}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Update video metadata (title, etc.)
   *
   * POST /library/{libraryId}/videos/{videoId}
   */
  static async updateVideo(
    videoId: string,
    updates: { title?: string; isPublic?: boolean },
  ): Promise<boolean> {
    const endpoint = `${this.getApiBase()}/videos/${videoId}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[BunnyStream] Update failed (${response.status}): ${text}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Fetch a signed HLS URL (if token auth is enabled on Stream)
   * Bunny Stream supports token authentication per video.
   */
  static getSignedHlsUrl(
    videoId: string,
    expiresInSeconds: number = 86400,
  ): string {
    const hlsUrl = this.getHlsUrl(videoId);
    if (!hlsUrl) return "";
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = crypto
      .createHash("sha256")
      .update(`${env.bunny.tokenAuthKey}${expires}${videoId}`)
      .digest("hex");
    return `${hlsUrl}?token=${token}&expires=${expires}`;
  }

  /**
   * Validate if a file can be uploaded to Bunny Stream
   */
  static validateUpload(file: { type: string; size: number }): {
    valid: boolean;
    error?: string;
  } {
    if (!env.bunnyStream.allowedVideoTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid video format. Allowed: MP4, WebM, OGG, MOV, AVI, MKV`,
      };
    }
    if (file.size > env.bunnyStream.maxVideoSize) {
      return {
        valid: false,
        error: `Video too large. Maximum size: 5GB`,
      };
    }
    return { valid: true };
  }

  /**
   * Check if Bunny Stream is configured
   */
  static isConfigured(): boolean {
    return !!(env.bunnyStream.apiKey && env.bunnyStream.libraryId);
  }
}

export default BunnyService;
