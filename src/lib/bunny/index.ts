// src/lib/bunny/index.ts
// Bunny Storage + Pull Zone integration for video storage and public delivery

import { env } from "@/config/env";

export interface BunnyUploadOptions {
  folder?: string;
  publicId?: string;
  mimeType?: string;
  overwrite?: boolean;
}

export interface BunnyUploadResult {
  storagePath: string;
  url: string;
  bytes: number;
  mimeType: string;
  filename: string;
}

const STORAGE_API_BASE = "https://storage.bunnycdn.com";
const PULL_ZONE_URL = env.bunny.pullZoneUrl.replace(/\/+$/, "");

function normalizePath(value: string) {
  return value
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\/-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+$/, "");
}

export class BunnyService {
  static getStorageEndpoint(storagePath: string): string {
    const normalizedPath = normalizePath(storagePath);
    return `${STORAGE_API_BASE}/${env.bunny.storageZone}/${encodeURI(
      normalizedPath,
    )}`;
  }

  static getPublicUrl(storagePath: string): string {
    const normalizedPath = normalizePath(storagePath);
    return `${PULL_ZONE_URL}/${encodeURI(normalizedPath)}`;
  }

  static async uploadFile(
    file: string | Buffer,
    mimeType: string,
    options: BunnyUploadOptions = {},
  ): Promise<BunnyUploadResult> {
    if (!env.bunny.storageZone || !env.bunny.accessKey || !PULL_ZONE_URL) {
      throw new Error("Bunny storage is not configured properly");
    }

    const folder =
      options.folder || env.bunny.defaultFolder || "educational-platform";
    const filename = options.publicId
      ? normalizePath(options.publicId)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${folder}/${filename}`.replace(/\/+/g, "/");

    const body = typeof file === "string" ? Buffer.from(file, "utf-8") : file;

    const response = await fetch(this.getStorageEndpoint(storagePath), {
      method: "PUT",
      headers: {
        AccessKey: env.bunny.accessKey,
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Bunny storage upload failed (${response.status}): ${message}`,
      );
    }

    return {
      storagePath,
      url: this.getPublicUrl(storagePath),
      bytes: Buffer.byteLength(body),
      mimeType,
      filename,
    };
  }

  static async uploadVideo(
    file: string | Buffer,
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

  static async deleteFile(storagePath: string): Promise<boolean> {
    if (!env.bunny.storageZone || !env.bunny.accessKey) {
      return false;
    }

    const response = await fetch(this.getStorageEndpoint(storagePath), {
      method: "DELETE",
      headers: {
        AccessKey: env.bunny.accessKey,
      },
    });

    return response.ok;
  }

  static getSignedUrl(storagePath: string, _expiresIn = 86400): string {
    return this.getPublicUrl(storagePath);
  }

  static getVideoThumbnail(storagePath: string): string {
    return this.getPublicUrl(storagePath);
  }

  static getStreamingUrl(storagePath: string): string {
    return this.getPublicUrl(storagePath);
  }
}

export default BunnyService;
