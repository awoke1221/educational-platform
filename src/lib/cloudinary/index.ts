// src/lib/cloudinary/index.ts
// Cloudinary Integration for Video & Image Upload

import { v2 as cloudinary } from "cloudinary";
import { env } from "@/config/env";

// ============================================
// Cloudinary Configuration
// ============================================

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

// ============================================
// Upload Options Types
// ============================================

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  overwrite?: boolean;
  transformation?: Record<string, any>[];
  eager?: Record<string, any>[];
  eagerAsync?: boolean;
}

// ============================================
// Upload Result Type
// ============================================

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  originalFilename?: string;
}

// ============================================
// Cloudinary Service Class
// ============================================

export class CloudinaryService {
  /**
   * Upload a file (image or video) from a buffer or base64 string
   */
  static async upload(
    file: string | Buffer,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const uploadOptions: Record<string, any> = {
      folder: options.folder || "educational-platform",
      resource_type: options.resourceType || "auto",
      overwrite: options.overwrite ?? true,
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    if (options.eager) {
      uploadOptions.eager = options.eager;
      uploadOptions.eager_async = options.eagerAsync ?? false;
    }

    // Convert Buffer to base64 data URI for Cloudinary
    let uploadSource: string;
    if (Buffer.isBuffer(file)) {
      const mimeType =
        options.resourceType === "video" ? "video/mp4" : "image/jpeg";
      uploadSource = `data:${mimeType};base64,${file.toString("base64")}`;
    } else {
      uploadSource = file;
    }

    const result = await cloudinary.uploader.upload(
      uploadSource,
      uploadOptions,
    );

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width || 0,
      height: result.height || 0,
      bytes: result.bytes,
      duration: result.duration,
      originalFilename: result.original_filename,
    };
  }

  /**
   * Upload a video specifically with HLS streaming support
   */
  static async uploadVideo(
    file: string | Buffer,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const result = await this.upload(file, {
      ...options,
      resourceType: "video",
      eager: [
        {
          streaming_profile: "hd",
          format: "m3u8",
        },
      ],
      eagerAsync: true,
      transformation: [
        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });

    return result;
  }

  /**
   * Upload a course cover image
   */
  static async uploadCoverImage(
    file: string | Buffer,
    courseTitle: string,
  ): Promise<UploadResult> {
    return this.upload(file, {
      folder: "educational-platform/covers",
      resourceType: "image",
      transformation: [
        { width: 1280, height: 720, crop: "fill", quality: "auto" },
      ],
    });
  }

  /**
   * Delete a file by public ID
   */
  static async deleteFile(
    publicId: string,
    resourceType: "image" | "video" | "raw" = "image",
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === "ok";
    } catch (error) {
      console.error("[CLOUDINARY] Delete failed:", error);
      return false;
    }
  }

  /**
   * Generate a signed URL with expiration for secure streaming
   */
  static getSignedUrl(
    publicId: string,
    options: {
      expiresIn?: number; // seconds from now
      transformation?: Record<string, any>;
    } = {},
  ): string {
    const expiresIn = options.expiresIn || 86400; // Default: 24 hours
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;

    const signatureConfig: Record<string, any> = {
      timestamp,
      public_id: publicId,
    };

    if (options.transformation) {
      signatureConfig.transformation = options.transformation;
    }

    return cloudinary.url(publicId, {
      sign_url: true,
      type: "upload",
      resource_type: "video",
      expires_at: timestamp,
      ...options.transformation,
    });
  }

  /**
   * Generate a thumbnail URL for a video
   */
  static getVideoThumbnail(
    publicId: string,
    options: { width?: number; height?: number } = {},
  ): string {
    const { width = 320, height = 180 } = options;

    return cloudinary.url(publicId, {
      resource_type: "video",
      transformation: [
        { width, height, crop: "fill", quality: "auto" },
        { fetch_format: "auto" },
      ],
    });
  }

  /**
   * Get video streaming URL (HLS)
   */
  static getStreamingUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: "video",
      streaming_profile: "hd",
      format: "m3u8",
    });
  }

  /**
   * Create an upload signature for client-side uploads
   */
  static getUploadSignature(
    options: {
      folder?: string;
      resourceType?: string;
      timestamp?: number;
    } = {},
  ): {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  } {
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000);
    const folder = options.folder || "educational-platform";
    const apiKey = env.cloudinary.apiKey;

    const params: Record<string, any> = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      env.cloudinary.apiSecret,
    );

    return {
      signature,
      timestamp,
      apiKey,
      cloudName: env.cloudinary.cloudName,
    };
  }

  /**
   * Search for resources
   */
  static async searchResources(
    query: string,
    options: { maxResults?: number; resourceType?: string } = {},
  ): Promise<any[]> {
    const { maxResults = 50, resourceType = "video" } = options;

    const result = await cloudinary.search
      .expression(query)
      .max_results(maxResults)
      .with_field("tags")
      .execute();

    return result.resources;
  }

  /**
   * Get video metadata
   */
  static async getVideoMetadata(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "video",
        image_metadata: true,
        media_metadata: true,
      });
      return result;
    } catch (error) {
      console.error("[CLOUDINARY] Failed to get video metadata:", error);
      return null;
    }
  }
}

export default CloudinaryService;
