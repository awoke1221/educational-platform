// src/lib/storage/supabase.ts
// Supabase Storage Integration for Receipt & File Management
// Professional implementation with signed URLs, bucket management, and validation

import { randomUUID } from "crypto";
import { supabaseAdmin, getSupabaseAdmin  } from "@/lib/db/supabaseAdmin";

// ============================================
// Configuration
// ============================================

const STORAGE_CONFIG = {
  receiptsBucket: process.env.SUPABASE_STORAGE_RECEIPTS_BUCKET || "receipts",
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as string[],
  urlExpiry: 60 * 60 * 24 * 7, // 7 days for signed URLs (seconds)
} as const;

// ============================================
// Types
// ============================================

export interface UploadReceiptResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

// ============================================
// File Validation
// ============================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateReceiptFile(
  mimeType: string,
  size: number,
  filename: string,
): FileValidationResult {
  if (!STORAGE_CONFIG.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type "${mimeType}". Allowed: ${STORAGE_CONFIG.allowedMimeTypes.join(", ")}`,
    };
  }

  if (size > STORAGE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Max: ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`,
    };
  }

  // Sanitize filename — remove path separators, only keep safe chars
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized) {
    return { valid: false, error: "Invalid filename" };
  }

  return { valid: true };
}

// ============================================
// Ensure Bucket Exists (silent — handles RLS-restricted environments)
// ============================================

async function ensureBucket(bucketName: string): Promise<boolean> {
  if (!supabaseAdmin) return false;

  try {
    // Try to create the bucket — if it already exists, Supabase returns a 409
    // which is fine. If RLS blocks creation, we assume the bucket exists.
    const { error } = await getSupabaseAdmin().storage.createBucket(
      bucketName,
      {
        public: true,
        allowedMimeTypes: STORAGE_CONFIG.allowedMimeTypes,
        fileSizeLimit: STORAGE_CONFIG.maxFileSize,
      },
    );

    if (error) {
      // Bucket already exists (duplicate name) — that's OK
      if (error.message?.includes("already exists") || error.status === 409) {
        console.log(`[STORAGE] Bucket "${bucketName}" already exists`);
        return true;
      }

      // RLS policy blocks creation — bucket likely exists already
      if (
        error.message?.includes("row-level security") ||
        error.status === 403 ||
        error.statusCode === "403"
      ) {
        console.log(
          `[STORAGE] Bucket "${bucketName}" assumed to exist (RLS restricted)`,
        );
        return true;
      }

      console.error(
        `[STORAGE] Failed to create bucket "${bucketName}":`,
        error,
      );
      return false;
    }

    console.log(`[STORAGE] Bucket "${bucketName}" created successfully`);
    return true;
  } catch (err) {
    console.error("[STORAGE] ensureBucket error:", err);
    return false;
  }
}

// ============================================
// Upload Receipt to Supabase Storage
// ============================================

export async function uploadReceipt(
  userId: string,
  fileBase64: string,
  filename: string,
  mimeType: string,
): Promise<UploadReceiptResult> {
  try {
    if (!supabaseAdmin) {
      return {
        success: false,
        publicUrl: "",
        storagePath: "",
        error: "Storage not configured",
      };
    }

    // Ensure bucket exists
    const bucketReady = await ensureBucket(STORAGE_CONFIG.receiptsBucket);
    if (!bucketReady) {
      return {
        success: false,
        publicUrl: "",
        storagePath: "",
        error: `Storage bucket "${STORAGE_CONFIG.receiptsBucket}" is not available`,
      };
    }

    // Validate file
    const fileSize = Math.ceil((fileBase64.length * 3) / 4); // approximate decoded size
    const validation = validateReceiptFile(mimeType, fileSize, filename);
    if (!validation.valid) {
      return {
        success: false,
        publicUrl: "",
        storagePath: "",
        error: validation.error,
      };
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(fileBase64, "base64");

    // Generate a unique storage path: receipts/{userId}/{uuid}_{sanitizedFilename}
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = randomUUID();
    const storagePath = `${userId}/${uniqueId}_${sanitizedFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabaseAdmin()
      .storage.from(STORAGE_CONFIG.receiptsBucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[STORAGE] Upload error:", uploadError);
      return {
        success: false,
        publicUrl: "",
        storagePath: "",
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // Get public URL
    const { data: urlData } = getSupabaseAdmin()
      .storage.from(STORAGE_CONFIG.receiptsBucket)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl || "";

    console.log(`[STORAGE] Receipt uploaded successfully: ${storagePath}`);

    return {
      success: true,
      publicUrl,
      storagePath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    console.error("[STORAGE] uploadReceipt error:", err);
    return { success: false, publicUrl: "", storagePath: "", error: message };
  }
}

// ============================================
// Delete File from Storage
// ============================================

export async function deleteFile(storagePath: string): Promise<DeleteResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: "Storage not configured" };
    }

    const { error } = await getSupabaseAdmin()
      .storage.from(STORAGE_CONFIG.receiptsBucket)
      .remove([storagePath]);

    if (error) {
      console.error("[STORAGE] Delete error:", error);
      return { success: false, error: `Delete failed: ${error.message}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown delete error";
    console.error("[STORAGE] deleteFile error:", err);
    return { success: false, error: message };
  }
}

// ============================================
// Generate Signed URL (for private buckets)
// ============================================

export async function getSignedUrl(
  storagePath: string,
): Promise<string | null> {
  try {
    if (!supabaseAdmin) return null;

    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_CONFIG.receiptsBucket)
      .createSignedUrl(storagePath, STORAGE_CONFIG.urlExpiry);

    if (error || !data) {
      console.error("[STORAGE] Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("[STORAGE] getSignedUrl error:", err);
    return null;
  }
}

// ============================================
// List all files for a user (admin utility)
// ============================================

export async function listUserReceipts(userId: string): Promise<string[]> {
  try {
    if (!supabaseAdmin) return [];

    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_CONFIG.receiptsBucket)
      .list(userId, { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error("[STORAGE] List error:", error);
      return [];
    }

    return (data || []).map((file) => file.name);
  } catch (err) {
    console.error("[STORAGE] listUserReceipts error:", err);
    return [];
  }
}

// ============================================
// Storage Service (class-based API)
// ============================================

export class StorageService {
  static readonly bucket = STORAGE_CONFIG.receiptsBucket;
  static readonly maxFileSize = STORAGE_CONFIG.maxFileSize;
  static readonly allowedMimeTypes = STORAGE_CONFIG.allowedMimeTypes;

  static async uploadReceipt(
    userId: string,
    fileBase64: string,
    filename: string,
    mimeType: string,
  ): Promise<UploadReceiptResult> {
    return uploadReceipt(userId, fileBase64, filename, mimeType);
  }

  static async deleteFile(storagePath: string): Promise<DeleteResult> {
    return deleteFile(storagePath);
  }

  static async getSignedUrl(storagePath: string): Promise<string | null> {
    return getSignedUrl(storagePath);
  }

  static async listUserReceipts(userId: string): Promise<string[]> {
    return listUserReceipts(userId);
  }
}

export default StorageService;

