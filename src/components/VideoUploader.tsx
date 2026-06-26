"use client";

// ============================================
// 🐰 Bunny Video/File Uploader Component
// ============================================
// Features:
// - Drag & drop support
// - File type validation
// - Upload progress bar
// - Multiple file queue
// - Direct-to-Bunny upload option
// - Thumbnail preview for videos
// - Error handling with retry
// ============================================

import { useState, useRef, useCallback } from "react";

// ============================================
// Types
// ============================================

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  result?: {
    url: string;
    storagePath: string;
    cdnUrl: string;
    bytes: number;
    filename: string;
  };
}

export interface VideoUploaderProps {
  /** Type of upload */
  uploadType?: "video" | "image" | "document";
  /** Optional folder path override */
  folder?: string;
  /** Course ID for automatic path organization */
  courseId?: string;
  /** Lecture ID for automatic path organization */
  lectureId?: string;
  /** Called when all uploads complete */
  onUploadComplete?: (results: UploadFile[]) => void;
  /** Called when a single file uploads successfully */
  onUploadSuccess?: (file: UploadFile) => void;
  /** Called when a single file upload fails */
  onUploadError?: (file: UploadFile, error: string) => void;
  /** Max file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Whether to use direct-to-Bunny upload (bypasses server) */
  directUpload?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Dropzone label */
  label?: string;
  /** Whether to show file preview */
  showPreview?: boolean;
}

// ============================================
// Constants
// ============================================

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================
// Component
// ============================================

export default function VideoUploader({
  uploadType = "video",
  folder,
  courseId,
  lectureId,
  onUploadComplete,
  onUploadSuccess,
  onUploadError,
  maxSize,
  allowedTypes,
  directUpload = false,
  className = "",
  label,
  showPreview = true,
}: VideoUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFileSize =
    maxSize || (uploadType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE);
  const allowedMimeTypes =
    allowedTypes || (uploadType === "video" ? VIDEO_TYPES : IMAGE_TYPES);

  // ============================================
  // Generate unique ID
  // ============================================

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // ============================================
  // Validate file
  // ============================================

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedMimeTypes.includes(file.type)) {
        return `Invalid file type: ${file.type}. Allowed: ${allowedMimeTypes.map((t) => t.split("/")[1]).join(", ")}`;
      }
      if (file.size > maxFileSize) {
        const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
        return `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum: ${sizeMB}MB`;
      }
      if (file.size === 0) {
        return "File is empty";
      }
      return null;
    },
    [allowedMimeTypes, maxFileSize],
  );

  // ============================================
  // Add files to queue
  // ============================================

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: UploadFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          console.warn(`[Uploader] Rejected ${file.name}: ${error}`);
          continue;
        }
        validFiles.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "pending",
          progress: 0,
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [validateFile],
  );

  // ============================================
  // Remove file from queue
  // ============================================

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ============================================
  // Clear all files
  // ============================================

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // ============================================
  // Upload a single file via server proxy
  // ============================================

  const uploadViaServer = useCallback(
    async (uploadFile: UploadFile): Promise<UploadFile> => {
      const formData = new FormData();
      formData.append("file", uploadFile.file);
      formData.append("type", uploadType);

      const token = localStorage.getItem("token");

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress } : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && response.success) {
              const result: UploadFile = {
                ...uploadFile,
                status: "success",
                progress: 100,
                result: {
                  url: response.data.url,
                  storagePath: response.data.publicId,
                  cdnUrl: response.data.url,
                  bytes: response.data.bytes,
                  filename: response.data.filename,
                },
              };
              resolve(result);
            } else {
              resolve({
                ...uploadFile,
                status: "error",
                error: response.error || "Upload failed",
              });
            }
          } catch {
            resolve({
              ...uploadFile,
              status: "error",
              error: "Failed to parse server response",
            });
          }
        };

        xhr.onerror = () => {
          resolve({
            ...uploadFile,
            status: "error",
            error: "Network error during upload",
          });
        };

        xhr.send(formData);
      });
    },
    [uploadType],
  );

  // ============================================
  // Upload a single file directly to Bunny
  // ============================================

  const uploadDirectToBunny = useCallback(
    async (uploadFile: UploadFile): Promise<UploadFile> => {
      const token = localStorage.getItem("token");

      try {
        // Step 1: Get signed upload URL from our server
        const response = await fetch("/api/upload/direct-to-bunny", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            filename: uploadFile.name,
            folder,
            type: uploadType,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          return {
            ...uploadFile,
            status: "error",
            error: data.error || "Failed to get upload URL",
          };
        }

        const { uploadUrl, storagePath, headers: uploadHeaders } = data.data;

        // Step 2: Upload directly to Bunny from browser
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);

          // Set Bunny auth headers
          Object.entries(uploadHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value as string);
          });
          xhr.setRequestHeader("Content-Type", uploadFile.file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, progress } : f,
                ),
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const cdnUrl = `https://${new URL(uploadUrl).hostname.replace("storage.bunnycdn.com", "b-cdn.net")}/${storagePath}`;
              resolve({
                ...uploadFile,
                status: "success",
                progress: 100,
                result: {
                  url: cdnUrl,
                  storagePath,
                  cdnUrl,
                  bytes: uploadFile.size,
                  filename: uploadFile.name,
                },
              });
            } else {
              resolve({
                ...uploadFile,
                status: "error",
                error: `Direct upload failed (${xhr.status})`,
              });
            }
          };

          xhr.onerror = () => {
            resolve({
              ...uploadFile,
              status: "error",
              error: "Network error during direct upload",
            });
          };

          xhr.send(uploadFile.file);
        });
      } catch (error: any) {
        return {
          ...uploadFile,
          status: "error",
          error: error.message || "Upload failed",
        };
      }
    },
    [folder, uploadType],
  );

  // ============================================
  // Start upload
  // ============================================

  const startUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const results: UploadFile[] = [];

    for (const uploadFile of pendingFiles) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "uploading" } : f,
        ),
      );

      const uploadFn = directUpload ? uploadDirectToBunny : uploadViaServer;
      const result = await uploadFn(uploadFile);

      // Update file status
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? result : f)),
      );

      results.push(result);

      if (result.status === "success") {
        onUploadSuccess?.(result);
      } else {
        onUploadError?.(result, result.error || "Unknown error");
      }
    }

    setIsUploading(false);
    onUploadComplete?.(results);
  }, [
    files,
    directUpload,
    uploadViaServer,
    uploadDirectToBunny,
    onUploadComplete,
    onUploadSuccess,
    onUploadError,
  ]);

  // ============================================
  // Drag & Drop handlers
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles],
  );

  // ============================================
  // Format file size
  // ============================================

  const formatSize = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  // ============================================
  // Get file icon
  // ============================================

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) {
      return (
        <svg
          className="w-8 h-8 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (type.startsWith("image/")) {
      return (
        <svg
          className="w-8 h-8 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-8 h-8 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  };

  // ============================================
  // Render
  // ============================================

  const defaultLabel =
    uploadType === "video"
      ? "Drop video files here or click to browse"
      : uploadType === "image"
        ? "Drop image files here or click to browse"
        : "Drop files here or click to browse";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        ref={fileInputRef as any}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragging
              ? "border-secondary bg-secondary/10 scale-[1.02]"
              : "border-gray-300 hover:border-secondary/50 hover:bg-gray-50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedMimeTypes.join(",")}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center gap-3">
          {/* Upload Icon */}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? "bg-secondary/20" : "bg-gray-100"
            }`}
          >
            <svg
              className={`w-7 h-7 ${isDragging ? "text-secondary" : "text-gray-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Label */}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {label || defaultLabel}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {uploadType === "video"
                ? "MP4, WebM, OGG, MOV, AVI, MKV"
                : "JPEG, PNG, WebP, GIF, AVIF"}
              {" • "}
              Max {uploadType === "video" ? "5GB" : "10MB"}
            </p>
          </div>
        </div>
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            {!isUploading && (
              <div className="flex gap-2">
                <button
                  onClick={clearFiles}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  file.status === "error"
                    ? "border-red-200 bg-red-50"
                    : file.status === "success"
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
                }`}
              >
                {/* Icon */}
                {getFileIcon(file.type)}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)}
                    {file.status === "uploading" && ` • ${file.progress}%`}
                    {file.status === "error" && (
                      <span className="text-red-500 ml-2">{file.error}</span>
                    )}
                    {file.status === "success" && (
                      <span className="text-green-500 ml-2">Uploaded</span>
                    )}
                  </p>

                  {/* Progress Bar */}
                  {file.status === "uploading" && (
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Remove / Retry */}
                {!isUploading && file.status === "pending" && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {files.some((f) => f.status === "pending") && (
            <button
              onClick={startUpload}
              disabled={isUploading}
              className="w-full py-2.5 bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#a30000]/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Upload {files.filter((f) => f.status === "pending").length}{" "}
                  file
                  {files.filter((f) => f.status === "pending").length !== 1
                    ? "s"
                    : ""}
                </>
              )}
            </button>
          )}

          {/* Results Summary */}
          {files.some((f) => f.status === "success") && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {files.filter((f) => f.status === "success").length} file(s)
              uploaded successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
}
