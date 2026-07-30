"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { handleAuthError } from "@/lib/utils/auth-error";
import { formatDuration } from "@/lib/utils/common";

// ============================================
// Types
// ============================================

interface BunnyVideo {
  guid: string;
  title: string;
  length: number;
  status: number;
  views: number;
  dateUploaded: string;
  encodeProgress: number;
  hlsUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  isLinked: boolean;
  lecture: {
    id: string;
    title: string;
    orderIndex: number;
    courseId: string;
    courseTitle: string;
  } | null;
}

interface SyncResult {
  synced: number;
  failed: number;
  totalVideos: number;
  existingLectures: number;
  totalLecturesNow?: number;
  groups?: { group: string; count: number }[];
  errors?: { title: string; error: string }[];
  courseId: string;
  message: string;
  dryRun?: boolean;
  preview?: {
    title: string;
    originalTitle: string;
    group: string;
    duration: number | null;
    videoId: string;
    orderIndex: number;
    thumbnailUrl: string;
  }[];
  willCreate?: number;
  orphansFound?: number;
}

// ============================================
// Helpers
// ============================================

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(video: BunnyVideo) {
  if (video.encodeProgress < 100) {
    return {
      label: `Encoding ${video.encodeProgress}%`,
      styles: "bg-amber-100 text-amber-700",
    };
  }
  if (video.status === 3) {
    return { label: "Failed", styles: "bg-red-100 text-red-700" };
  }
  return { label: "Ready", styles: "bg-green-100 text-green-700" };
}

// ============================================
// Main Admin Bunny Sync Page
// ============================================

export default function AdminBunnySyncPage() {
  const router = useRouter();

  // Auth
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Videos
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // Filter
  const [filter, setFilter] = useState<"all" | "orphans" | "linked">("all");

  // ============================================
  // Auth Check
  // ============================================

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
  }, [router]);

  // ============================================
  // Fetch Videos
  // ============================================

  const fetchVideos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError("");

    try {
      const result = await authFetchJson("/api/bunny/videos", {
        method: "GET",
      });

      if (result.response.status === 401 || result.response.status === 403) {
        handleAuthError(result.response.status, router);
        return;
      }

      if (result.response.ok && result.data.success) {
        setVideos(result.data.data.videos || []);
        setIsAuthorized(true);
      } else {
        setFetchError(result.data.error || "Failed to load videos");
      }
    } catch (err: any) {
      setFetchError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) fetchVideos();
  }, [token, fetchVideos]);

  // ============================================
  // Run Sync
  // ============================================

  const handleSync = async (dryRun: boolean = false) => {
    if (!token) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");

    try {
      const url = dryRun
        ? "/api/bunny/videos/sync?dryRun=true"
        : "/api/bunny/videos/sync";

      const result = await authFetchJson(url, {
        method: "POST",
      });

      if (result.response.status === 401 || result.response.status === 403) {
        handleAuthError(result.response.status, router);
        return;
      }

      if (result.response.ok && result.data.success) {
        setSyncResult(result.data.data);
        if (!dryRun) {
          // Refresh video list after actual sync
          fetchVideos();
        }
      } else {
        setSyncError(result.data.error || "Sync failed");
      }
    } catch (err: any) {
      setSyncError(err.message || "Network error");
    } finally {
      setSyncing(false);
    }
  };

  // ============================================
  // Filtered videos
  // ============================================

  const filteredVideos = videos.filter((v) => {
    if (filter === "orphans") return !v.isLinked;
    if (filter === "linked") return v.isLinked;
    return true;
  });

  const linkedCount = videos.filter((v) => v.isLinked).length;
  const orphanCount = videos.filter((v) => !v.isLinked).length;

  // ============================================
  // Render
  // ============================================

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🐰 Bunny Stream Sync
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Sync all Bunny Stream videos as lectures in your courses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/courses"
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ← Back to Courses
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pb-1">
            <button
              onClick={() => setFilter("all")}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({videos.length})
            </button>
            <button
              onClick={() => setFilter("orphans")}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                filter === "orphans"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              📦 Orphan ({orphanCount})
            </button>
            <button
              onClick={() => setFilter("linked")}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                filter === "linked"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔗 Linked ({linkedCount})
            </button>

            <div className="flex-1" />

            <button
              onClick={() => handleSync(true)}
              disabled={syncing || orphanCount === 0}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Preview what would be synced"
            >
              {syncing ? "Analyzing..." : "👁️ Preview Sync"}
            </button>
            <button
              onClick={() => handleSync(false)}
              disabled={syncing || orphanCount === 0}
              className="text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white font-medium hover:shadow-lg hover:shadow-[#a30000]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </span>
              ) : (
                `🚀 Sync ${orphanCount} Orphan Videos`
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {/* ── Sync Result Banner ────────────────────── */}
        <AnimatePresence>
          {syncResult && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={`rounded-xl p-5 mb-6 border ${
                syncResult.dryRun
                  ? "bg-blue-50 border-blue-200"
                  : syncResult.synced > 0
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {syncResult.dryRun
                    ? "👁️"
                    : syncResult.synced > 0
                      ? "✅"
                      : "ℹ️"}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {syncResult.dryRun
                      ? "Sync Preview — No changes made"
                      : syncResult.message}
                  </h3>

                  {/* Summary stats */}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                      <span className="text-gray-500">Total Bunny Videos</span>
                      <p className="font-bold text-gray-900">
                        {syncResult.totalVideos}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                      <span className="text-gray-500">Existing Lectures</span>
                      <p className="font-bold text-gray-900">
                        {syncResult.existingLectures}
                      </p>
                    </div>
                    {syncResult.dryRun ? (
                      <div className="bg-amber-50 rounded-lg px-3 py-2 shadow-sm border border-amber-200">
                        <span className="text-amber-600">Will Create</span>
                        <p className="font-bold text-amber-700">
                          {syncResult.willCreate || 0}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 rounded-lg px-3 py-2 shadow-sm border border-green-200">
                        <span className="text-green-600">Synced</span>
                        <p className="font-bold text-green-700">
                          {syncResult.synced}
                        </p>
                      </div>
                    )}
                    {syncResult.failed > 0 && (
                      <div className="bg-red-50 rounded-lg px-3 py-2 shadow-sm border border-red-200">
                        <span className="text-red-600">Failed</span>
                        <p className="font-bold text-red-700">
                          {syncResult.failed}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Groups detected */}
                  {syncResult.groups && syncResult.groups.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1.5">
                        Auto-detected groups:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {syncResult.groups.map((g, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-700"
                          >
                            {g.group} ({g.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dry run preview table */}
                  {syncResult.dryRun &&
                    syncResult.preview &&
                    syncResult.preview.length > 0 && (
                      <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Preview — {syncResult.preview.length} lecture(s) to
                            be created
                          </p>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                          {syncResult.preview.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                            >
                              {/* Thumbnail */}
                              <div className="w-12 h-8 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    🎬
                                  </div>
                                )}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {item.group} •{" "}
                                  {item.duration
                                    ? formatDuration(item.duration)
                                    : "Unknown duration"}
                                </p>
                              </div>
                              {/* Order */}
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                #{item.orderIndex}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Errors */}
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-3 bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-xs font-medium text-red-700 mb-1">
                        Errors ({syncResult.errors.length}):
                      </p>
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {syncResult.errors.map((e, i) => (
                          <li key={i}>
                            {e.title}: {e.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSyncResult(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync error */}
        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700">{syncError}</p>
          </div>
        )}

        {/* ── Video list ─────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Fetching Bunny Stream videos...
              </p>
            </div>
          </div>
        ) : fetchError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium mb-2">
              Failed to load videos
            </p>
            <p className="text-red-500 text-sm mb-4">{fetchError}</p>
            <button
              onClick={fetchVideos}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">
                  {filter === "orphans" ? "🎉" : "📭"}
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">
                  {filter === "orphans"
                    ? "No orphan videos!"
                    : filter === "linked"
                      ? "No linked videos"
                      : "No videos found"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {filter === "orphans"
                    ? "All Bunny Stream videos are already linked to lectures."
                    : filter === "all"
                      ? "Upload videos to Bunny Stream to see them here."
                      : "No videos are linked to any lecture yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Table header */}
                <div className="hidden sm:flex items-center gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Video</div>
                  <div className="w-20 text-center">Status</div>
                  <div className="w-24 text-center">Duration</div>
                  <div className="w-20 text-center">Views</div>
                  <div className="w-40 text-center">Association</div>
                  <div className="w-20 text-center">Uploaded</div>
                </div>

                {filteredVideos.map((video) => {
                  const status = getStatusBadge(video);
                  return (
                    <div
                      key={video.guid}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* Thumbnail + Title */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-20 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            {video.guid.substring(0, 12)}...
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="sm:w-20 text-center">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full ${status.styles}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="sm:w-24 text-center">
                        <span className="text-sm text-gray-600">
                          {video.length
                            ? formatDuration(Math.round(video.length))
                            : "—"}
                        </span>
                      </div>

                      {/* Views */}
                      <div className="sm:w-20 text-center">
                        <span className="text-sm text-gray-600">
                          {video.views.toLocaleString()}
                        </span>
                      </div>

                      {/* Association */}
                      <div className="sm:w-40 text-center">
                        {video.isLinked && video.lecture ? (
                          <Link
                            href={`/admin/courses/${video.lecture.courseId}`}
                            className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full hover:bg-green-200 transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                            {video.lecture.courseTitle}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                            Orphan
                          </span>
                        )}
                      </div>

                      {/* Upload date */}
                      <div className="sm:w-20 text-center">
                        <span className="text-xs text-gray-500">
                          {formatDate(video.dateUploaded)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
