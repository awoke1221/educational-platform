"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";
import { formatDuration } from "@/lib/utils/common";

// ============================================
// Types
// ============================================

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  orderIndex: number;
  isPublished: boolean;
  cloudinaryPublicId: string | null;
  videoUrl: string | null;
  views: number;
  courseId: string;
  courseTitle: string;
  courseCover: string | null;
  hlsUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

// ============================================
// Staggered grid animation variants
// ============================================

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ============================================
// Particle Field
// ============================================

function ParticleField({ count = 15 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/6 blur-[1px]"
          style={{
            left: `${(i * 17 + 7) % 100}%`,
            top: `${(i * 19 + 3) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
          }}
          animate={{
            y: [0, -12 - (i % 4), 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 5) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// Skeleton Card
// ============================================

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 rounded-full bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="flex justify-between pt-2 border-t border-white/10">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-3 w-12 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Video Library Page
// ============================================

export default function VideoLibraryPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    cachedAuthFetchJson("/api/videos", { method: "GET" }, 15_000)
      .then((result) => {
        if (result.response.ok && result.data.success) {
          setVideos(result.data.data.videos || []);
        }
      })
      .catch((err) => console.error("[VIDEO LIBRARY] Error:", err))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Extract unique courses for filter ──
  const courseOptions = useMemo(() => {
    const courseMap = new Map<string, string>();
    videos.forEach((v) => {
      if (v.courseId && v.courseTitle) {
        courseMap.set(v.courseId, v.courseTitle);
      }
    });
    return Array.from(courseMap.entries()).map(([id, title]) => ({
      id,
      title,
    }));
  }, [videos]);

  // ── Filtered videos ──
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCourse =
        selectedCourse === "all" || v.courseId === selectedCourse;
      return matchesSearch && matchesCourse;
    });
  }, [videos, searchQuery, selectedCourse]);

  // ── Group by course ──
  const groupedVideos = useMemo(() => {
    const groups = new Map<string, VideoItem[]>();
    filteredVideos.forEach((v) => {
      const key = v.courseId || "uncategorized";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(v);
    });
    return Array.from(groups.entries()).sort(([, a], [, b]) => {
      // Sort by course title
      const titleA = a[0]?.courseTitle || "";
      const titleB = b[0]?.courseTitle || "";
      return titleA.localeCompare(titleB);
    });
  }, [filteredVideos]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      total: videos.length,
      courses: courseOptions.length,
    }),
    [videos.length, courseOptions.length],
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Hero Section ── */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#dc2626]/6 to-[#ef4444]/3 blur-3xl animate-orb" />
          <motion.div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-[#7f1d1d]/8 to-transparent blur-3xl animate-orb-slow" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#dc2626]/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-[#ef4444]/20 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                {stats.total} Video{stats.total !== 1 ? "s" : ""} •{" "}
                {stats.courses} Course{stats.courses !== 1 ? "s" : ""}
              </span>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-gradient-to-r from-[#7f1d1d] to-[#dc2626] bg-clip-text text-transparent">
                Video
              </span>{" "}
              Library
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-white/70 mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Browse all your learning videos in one place
            </motion.p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </section>

      {/* ── Main Content ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* ── Filters ── */}
        {!loading && token && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#dc2626]/40 focus:ring-1 focus:ring-[#dc2626]/20 transition-all"
              />
            </div>

            {/* Course filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white/70 focus:outline-none focus:border-[#dc2626]/40 focus:ring-1 focus:ring-[#dc2626]/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Courses</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1a1a1a]">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Not logged in ── */}
        {!token && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <svg
                className="w-10 h-10 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Sign in to access videos
            </h3>
            <p className="text-white/50 max-w-md mb-6">
              Enroll in a course to start watching videos.
            </p>
            <div className="flex gap-3">
              <Link
                href="/auth/login"
                className="bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-[#a30000]/25 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/courses"
                className="bg-white/10 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-white/20 transition-all"
              >
                Browse Courses
              </Link>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && token && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <svg
                className="w-10 h-10 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No videos available
            </h3>
            <p className="text-white/50 max-w-md mb-6">
              Enroll in a course to access video content.
            </p>
            <Link
              href="/courses"
              className="bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-[#a30000]/25 transition-all"
            >
              Browse Courses
            </Link>
          </div>
        )}

        {/* ── No search results ── */}
        {!loading &&
          token &&
          videos.length > 0 &&
          filteredVideos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                <svg
                  className="w-8 h-8 text-white/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                No matches found
              </h3>
              <p className="text-white/50 text-sm">
                Try a different search term or filter.
              </p>
            </div>
          )}

        {/* ── Video Grid by Course ── */}
        {!loading &&
          token &&
          filteredVideos.length > 0 &&
          groupedVideos.map(([courseId, courseVideos]) => (
            <div key={courseId} className="mb-10">
              {/* Course header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-[#7f1d1d] to-[#dc2626] rounded-full inline-block" />
                  {courseVideos[0]?.courseTitle || "Uncategorized"}
                  <span className="text-xs text-white/40 font-normal ml-2">
                    {courseVideos.length} video
                    {courseVideos.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <Link
                  href={`/courses/${courseId}`}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  View Course →
                </Link>
              </div>

              {/* Video cards */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {courseVideos.map((video) => (
                  <motion.div
                    key={video.id}
                    variants={itemVariants}
                    className="group bg-white/[0.03] backdrop-blur-sm rounded-2xl overflow-hidden border border-white/5 hover:border-[#dc2626]/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/courses/${video.courseId}/lectures/${video.id}`,
                      )
                    }
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-10 h-10 text-white/20"
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
                        </div>
                      )}

                      {/* Duration badge */}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
                          {formatDuration(video.duration)}
                        </div>
                      )}

                      {/* Play icon overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3.5">
                      <p className="text-sm font-medium text-white truncate group-hover:text-[#dc2626] transition-colors">
                        {video.title}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-white/40">
                          {video.views.toLocaleString()} views
                        </span>
                        <span className="text-xs text-white/30">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
      </section>
    </div>
  );
}
