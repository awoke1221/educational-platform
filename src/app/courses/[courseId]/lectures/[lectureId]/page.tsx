"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedAuthFetchJson } from "@/lib/utils/cache";
import {
  saveVideoPosition,
  getVideoPosition,
  clearVideoPosition,
  markLectureCompleted,
  isLectureCompleted,
} from "@/lib/utils/videoPersistence";
import { formatDuration } from "@/lib/utils/common";
import {
  isCacheAvailable,
  isVideoUrl,
  cacheVideoResponse,
  preloadVideo,
} from "@/lib/utils/videoCache";
import Hls from "hls.js";

// ============================================
// Types
// ============================================

interface LectureDetail {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  orderIndex: number;
  videoUrl: string;
  cloudinaryPublicId: string | null;
  /** Bunny Stream HLS URL for adaptive bitrate streaming */
  hlsUrl: string | null;
  /** Bunny Stream embed URL */
  embedUrl: string | null;
  /** Bunny Stream thumbnail URL */
  thumbnailUrl: string | null;
  isPublished: boolean;
  courseId: string;
  course: {
    id: string;
    title: string;
    instructorId: string;
  };
  userProgress: {
    isCompleted: boolean;
    watchDuration: number;
    watchPercentage: number;
  } | null;
}

interface CourseLectures {
  courseId: string;
  lectures: {
    id: string;
    title: string;
    duration: number | null;
    orderIndex: number;
    isPublished: boolean;
    videoUrl?: string;
    cloudinaryPublicId?: string | null;
  }[];
  progress: Record<string, { isCompleted: boolean; watchPercentage: number }>;
}

interface Enrollment {
  id: string;
  status: string;
}

// ============================================
// Progress Tracking Configuration
// ============================================

const PROGRESS_INTERVAL = 15000;
const COMPLETION_THRESHOLD = 90;

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// ============================================
// Helper: Format seconds to MM:SS
// ============================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================
// Keyboard shortcut definitions
// ============================================

const SHORTCUTS = [
  { key: "Space", desc: "Play / Pause" },
  { key: "←", desc: "Rewind 10s" },
  { key: "→", desc: "Forward 10s" },
  { key: "F", desc: "Fullscreen" },
  { key: "M", desc: "Mute / Unmute" },
  { key: "↑", desc: "Volume up" },
  { key: "↓", desc: "Volume down" },
  { key: "?", desc: "Show shortcuts" },
];

// ============================================
// Main Component
// ============================================

export default function LecturePlayerPage() {
  const { courseId, lectureId } = useParams<{
    courseId: string;
    lectureId: string;
  }>();
  const router = useRouter();

  // Auth & Data state
  const [token, setToken] = useState<string>("");
  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [lectures, setLectures] = useState<CourseLectures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playedSegments, setPlayedSegments] = useState<
    { start: number; end: number }[]
  >([]);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<{ time: number; pct: number }>({
    time: 0,
    pct: 0,
  });

  // ============================================
  // Authentication check
  // ============================================

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push(
        `/auth/register?redirect=${encodeURIComponent(
          `/auth/register/payment?courseId=${courseId}&redirect=/courses/${courseId}`,
        )}`,
      );
      return;
    }
    setToken(t);
  }, [courseId, router]);

  // ============================================
  // Fetch lecture data & check enrollment
  // ============================================

  useEffect(() => {
    if (!token || !lectureId) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      setIsEnrolled(false);

      try {
        // Parallel fetch: profile, enrollments, lecture detail, and lecture list
        const [profilePromise, enrPromise, lecturePromise, listPromise] = [
          cachedAuthFetchJson("/api/user/profile", { method: "GET" }, 15_000),
          cachedAuthFetchJson("/api/enrollments", { method: "GET" }, 15_000),
          cachedAuthFetchJson(
            `/api/courses/${courseId}/lectures/${lectureId}`,
            { method: "GET" },
            15_000,
          ),
          cachedAuthFetchJson(
            `/api/courses/${courseId}/lectures`,
            { method: "GET" },
            15_000,
          ),
        ];

        const [profileResult, enrResult, lectureResult, listResult] =
          await Promise.all([
            profilePromise,
            enrPromise,
            lecturePromise,
            listPromise,
          ]);

        // Process profile
        let admin = false;
        if (profileResult.response.ok) {
          const profile = profileResult.data.data || {};
          admin = profile.role === "admin";
          setIsAdmin(admin);
          if (admin) setIsEnrolled(true);
        }

        // Process enrollment
        if (!admin) {
          const enrData = enrResult.data;
          const items =
            enrData.data?.data?.data ||
            enrData.data?.data ||
            enrData.data ||
            [];
          const activeEnrollment = items.some(
            (e: any) =>
              (e.courseId || e.course?.id) === courseId &&
              e.status === "active",
          );
          setIsEnrolled(activeEnrollment);
          if (!activeEnrollment) {
            setLoading(false);
            return;
          }
        }

        // Process lecture detail
        const lecData = lectureResult.data;
        if (!lectureResult.response.ok || !lecData.success) {
          setError(lecData.error || "ምዕራፍ አልተገኘም");
          setLoading(false);
          return;
        }
        setLecture(lecData.data);

        // Process lecture list
        if (listResult.response.ok && listResult.data.success) {
          setLectures(listResult.data.data);
        }
      } catch (err) {
        setError("መረጃ በመጫን ላይ ስህተት ተከስቷል");
        console.error("[LECTURE PLAYER] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, lectureId, courseId]);

  // ============================================
  // Find prev/next lectures
  // ============================================

  const currentIndex =
    lectures?.lectures.findIndex((l) => l.id === lectureId) ?? -1;
  const prevLecture =
    currentIndex > 0 ? lectures?.lectures[currentIndex - 1] : null;
  const nextLecture =
    currentIndex >= 0 && currentIndex < (lectures?.lectures.length ?? 0) - 1
      ? lectures?.lectures[currentIndex + 1]
      : null;

  // ============================================
  // Preload next lecture video when current one is playing
  // Uses Bunny Stream HLS URL (adaptive bitrate streaming)
  // ============================================

  useEffect(() => {
    if (!nextLecture || !lectures?.lectures) return;

    // Find the next lecture's video URL from the lecture list
    const next = lectures.lectures.find((l) => l.id === nextLecture.id);
    if (!next) return;

    // Get the video URL for preloading
    const streamId = next.cloudinaryPublicId || next.videoUrl || "";
    if (!streamId) return;

    // Wait until user is past 50% of the current video, then preload next
    if (!duration || currentTime / duration < 0.5) return;

    // Use Bunny Stream HLS URL
    const nextSrc = streamId.startsWith("http")
      ? streamId
      : `https://iframe.mediadelivery.net/${streamId}/playlist.m3u8`;
    if (isCacheAvailable()) {
      preloadVideo(nextSrc);
    }
  }, [currentTime, duration, nextLecture, lectures, lecture]);

  // ============================================
  // Send progress update to API
  // ============================================

  const sendProgress = useCallback(
    async (time: number, pct: number, completed?: boolean) => {
      if (!token || !lectureId) return;
      try {
        await authFetchJson("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lectureId,
            watchDuration: Math.floor(time),
            watchPercentage: Math.min(Math.round(pct), 100),
            isCompleted: completed,
          }),
        });
      } catch (err) {
        console.error("[PROGRESS] Failed to send:", err);
      }
    },
    [token, lectureId],
  );

  // ============================================
  // Periodic progress tracking
  // ============================================

  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const time = video.currentTime;
      const dur = video.duration || 1;
      const pct = (time / dur) * 100;

      // Track played segments for heatmap visualization
      setPlayedSegments((prev) => {
        const newSegments = [...prev];
        const last = newSegments[newSegments.length - 1];
        if (last && time - last.end < 3) {
          last.end = time;
        } else {
          newSegments.push({ start: time - 1, end: time });
        }
        // Keep last 200 segments max
        return newSegments.slice(-200);
      });

      if (
        Math.abs(pct - lastProgressRef.current.pct) > 2 ||
        time - lastProgressRef.current.time > 30
      ) {
        lastProgressRef.current = { time, pct };
        const shouldComplete = pct >= COMPLETION_THRESHOLD;
        if (shouldComplete) setIsCompleted(true);
        sendProgress(time, pct, shouldComplete);
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, sendProgress]);

  // ============================================
  // Video event handlers
  // ============================================

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    // Periodically save position (throttled by browser's timeupdate ~4-15Hz)
    if (video.currentTime > 5 && video.duration > 0) {
      saveVideoPosition(lectureId, video.currentTime, video.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);

    // Restore saved video position if not already completed
    if (!isLectureCompleted(lectureId)) {
      const saved = getVideoPosition(lectureId);
      if (
        saved &&
        saved.currentTime > 3 &&
        saved.currentTime < video.duration - 5
      ) {
        video.currentTime = saved.currentTime;
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) {
      const time = video.currentTime;
      const dur = video.duration || 1;
      const pct = (time / dur) * 100;
      // Save position on pause
      if (time > 3 && dur > 0) {
        saveVideoPosition(lectureId, time, dur);
      }
      sendProgress(time, pct, pct >= COMPLETION_THRESHOLD);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsCompleted(true);
    markLectureCompleted(lectureId);
    if (videoRef.current) {
      sendProgress(videoRef.current.duration, 100, true);
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handleCanPlay = () => {
    setIsBuffering(false);

    // Cache the video in the background for future plays
    const video = videoRef.current;
    // Priority: hlsUrl (Bunny Stream HLS) > cdnVideoUrl > streaming > raw
    const src =
      lecture?.hlsUrl ||
      lecture?.hlsUrl ||
      lecture?.videoUrl ||
      video?.src ||
      "";
    if (video && src && isCacheAvailable() && isVideoUrl(src)) {
      setTimeout(async () => {
        try {
          // For HLS streams, pre-fetch the playlist manifest
          const response = await fetch(src, {});
          if (response.ok) {
            await cacheVideoResponse(src, response);
          }
        } catch {
          // Silently fail — caching is opportunistic
        }
      }, 3000);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(
          videoRef.current.currentTime + seconds,
          videoRef.current.duration || 0,
        ),
      );
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const changeVolume = (delta: number) => {
    if (videoRef.current) {
      const newVol = Math.max(0, Math.min(1, volume + delta));
      videoRef.current.volume = newVol;
      setVolume(newVol);
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("[PiP] not supported:", err);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSpeedMenu(false);
  };

  // Auto-hide controls on mouse inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  }, [isPlaying]);

  const handleMouseMove = () => resetControlsTimer();

  // Ambient glow effect
  const updateAmbientGlow = useCallback(() => {
    const video = videoRef.current;
    const canvas = ambientRef.current;
    if (!video || !canvas || !isPlaying) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 40;
    canvas.height = 40;
    ctx.drawImage(video, 0, 0, 40, 40);

    const imageData = ctx.getImageData(0, 0, 40, 40).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < imageData.length; i += 16) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
      count++;
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const ambientEl = containerRef.current?.querySelector(
      ".ambient-glow",
    ) as HTMLElement;
    if (ambientEl) {
      ambientEl.style.background = `radial-gradient(ellipse at center, rgba(${r},${g},${b},0.35) 0%, rgba(${r},${g},${b},0.05) 70%, transparent 100%)`;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(updateAmbientGlow, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, updateAmbientGlow]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipTime(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "Slash":
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcuts(true);
          }
          break;
        case "KeyP":
          e.preventDefault();
          togglePiP();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume]);

  // ============================================
  // Video source helpers (computed before early returns to keep hooks stable)
  // ============================================

  const progress =
    currentTime && duration ? (currentTime / duration) * 100 : 0;
  const videoUrl = lecture?.hlsUrl || lecture?.videoUrl || "";
  const videoType = (() => {
    const ext = videoUrl.split(".").pop()?.split("?")[0]?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      ogg: "video/ogg",
      mov: "video/quicktime",
      m3u8: "application/x-mpegURL",
    };
    return mimeMap[ext || ""] || "video/mp4";
  })();
  const posterUrl = lecture?.thumbnailUrl || "";

  // ============================================
  // HLS.js initialization for Bunny Stream HLS playback
  // ============================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let hls: Hls | null = null;
    const isHlsStream =
      videoUrl.includes(".m3u8") || videoUrl.includes("playlist.m3u8");

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 60,
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("[HLS] Fatal error:", data.type, data.details);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls?.startLoad();
          }
        }
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoUrl]);

  // ============================================
  // Loading State
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-950">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-14 h-14 border-4 border-secondary/30 border-t-secondary rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-500 text-sm">በመጫን ላይ...</p>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // Error / Not Authenticated
  // ============================================

  if (error || !lecture) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-950">
        <motion.div
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">
            {error || "ምዕራፍ አልተገኘም"}
          </h2>
          <p className="text-gray-400 mb-6">
            {!token
              ? "ይህን ቪዲዮ ለማየት በመጀመሪያ ይግቡ።"
              : "የተጠየቀው ምዕራፍ አልተገኘም ወይም ለእርስዎ የሚገኝ አይደለም።"}
          </p>
          <div className="flex gap-3 justify-center">
            {!token ? (
              <>
                <Link
                  href="/auth/login"
                  className="bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300"
                >
                  ግባ
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-gray-800 text-gray-200 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-all"
                >
                  ተመዝገብ
                </Link>
              </>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="bg-secondary text-white px-6 py-2.5 rounded-lg font-medium hover:brightness-110 transition-all"
              >
                ወደ ኮርሱ ተመለስ
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // Not Enrolled
  // ============================================

  if (isEnrolled === false) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-950">
        <motion.div
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-amber-500/20">
            <svg
              className="w-8 h-8 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">ኮርሱ አልተመዘገቡም</h2>
          <p className="text-gray-400 mb-6">ይህን ቪዲዮ ለማየት በመጀመሪያ ለኮርሱ ይመዝገቡ።</p>
          <Link
            href={`/courses/${courseId}`}
            className="bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300"
          >
            ወደ ኮርሱ ተመለስ
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mini progress bar at top of page */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gray-800 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-secondary to-accent"
          style={{ width: `${Math.min(progress, 100)}%` }}
          layout
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top Navigation Bar */}
      <motion.div
        className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50 px-4 py-3 flex items-center justify-between"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-gray-800"
            title="ወደ ኮርሱ ተመለስ"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-white text-sm sm:text-base font-medium truncate">
              {lecture.title}
            </h1>
            <p className="text-gray-500 text-xs truncate">
              {lecture.course?.title || "Course"} • ምዕራፍ{" "}
              {(lecture.orderIndex ?? 0) + 1}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCompleted && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="hidden sm:inline-flex items-center gap-1 bg-green-900/50 text-green-400 text-xs px-3 py-1.5 rounded-full border border-green-800"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              ተጠናቋል
            </motion.span>
          )}
          <Link
            href={`/progress/${courseId}`}
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
          >
            እድገት
          </Link>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row">
        {/* ============================================ */}
        {/* Video Player Section */}
        {/* ============================================ */}
        <div className="flex-1 lg:max-w-[calc(100%-380px)]">
          <div
            ref={containerRef}
            className="relative bg-black group max-h-[50vh] overflow-hidden rounded-xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {/* Ambient glow background */}
            <div className="ambient-glow absolute inset-0 transition-all duration-1000 pointer-events-none opacity-60" />

            {/* Hidden canvas for color extraction */}
            <canvas ref={ambientRef} className="hidden" />

            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain cursor-pointer relative z-10"
              poster={posterUrl || undefined}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onClick={togglePlay}
              playsInline
              preload="metadata"
            >
              {/* 🐰 Primary: Bunny Stream HLS (adaptive bitrate) or legacy CDN */}
              <source src={videoUrl} type={videoType} />
              {/* 🔄 Fallback: Proxy through server when Stream/CDN blocked */}
              {lecture.videoUrl && lecture.videoUrl !== videoUrl && (
                <source src={lecture.videoUrl} type="video/mp4" />
              )}
              Your browser does not support the video tag.
            </video>

            {/* Buffering indicator */}
            <AnimatePresence>
              {isBuffering && isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none"
                >
                  <motion.div
                    className="w-10 h-10 border-[3px] border-white/30 border-t-secondary rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Play Button Overlay (when paused) */}
            {!isPlaying && !isBuffering && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20 transition-colors hover:bg-black/40"
                onClick={togglePlay}
              >
                <motion.div
                  className="w-20 h-20 bg-secondary/90 rounded-full flex items-center justify-center shadow-2xl shadow-secondary/20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg
                    className="w-10 h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </motion.div>
              </motion.div>
            )}

            {/* Skip indicators (show briefly on arrow keys) - simplified */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <span className="text-white/60 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                ← 10s
              </span>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <span className="text-white/60 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                10s →
              </span>
            </div>

            {/* Bottom Controls Overlay */}
            <motion.div
              animate={{
                opacity: showControls || !isPlaying ? 1 : 0,
                y: showControls || !isPlaying ? 0 : 20,
              }}
              transition={{ duration: 0.2 }}
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-20 pb-4 px-4 z-30 ${
                showControls || !isPlaying
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              }`}
            >
              {/* Progress Bar (Seek) */}
              <div className="mb-4 group/seek relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 appearance-none bg-gray-600/50 rounded-full cursor-pointer relative z-10
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-secondary/30
                    [&::-webkit-slider-thumb]:opacity-0 [&::-webkit-slider-thumb]:group-hover/seek:opacity-100
                    [&::-webkit-slider-thumb]:transition-opacity
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:bg-secondary [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-0"
                  style={{
                    background: `linear-gradient(to right, #a30000 ${progress}%, rgba(75,85,99,0.5) ${progress}%)`,
                  }}
                />
                {/* Time tooltip on hover */}
                <div className="absolute -top-7 left-0 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none font-mono">
                  {formatTime(currentTime)}
                </div>
              </div>

              {/* Control Buttons Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Play/Pause */}
                  <motion.button
                    onClick={togglePlay}
                    className="text-white hover:text-secondary transition-colors p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? (
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </motion.button>

                  {/* Skip Back 10s */}
                  <motion.button
                    onClick={() => skipTime(-10)}
                    className="text-gray-300 hover:text-white transition-colors p-1 hidden sm:block"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Rewind 10s"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                      <text
                        x="10.5"
                        y="15"
                        fontSize="7"
                        fontWeight="bold"
                        fill="currentColor"
                      >
                        10
                      </text>
                    </svg>
                  </motion.button>

                  {/* Skip Forward 10s */}
                  <motion.button
                    onClick={() => skipTime(10)}
                    className="text-gray-300 hover:text-white transition-colors p-1 hidden sm:block"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Forward 10s"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                      <text
                        x="10.5"
                        y="15"
                        fontSize="7"
                        fontWeight="bold"
                        fill="currentColor"
                      >
                        10
                      </text>
                    </svg>
                  </motion.button>

                  {/* Time Display */}
                  <span className="text-gray-300 text-xs font-mono tabular-nums hidden sm:block">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-gray-500 text-xs font-mono tabular-nums hidden sm:block">
                    / {formatTime(duration)}
                  </span>
                  {/* Compact time for mobile */}
                  <span className="text-gray-300 text-xs font-mono tabular-nums sm:hidden">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Volume */}
                  <div
                    className="flex items-center gap-1 relative"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <motion.button
                      onClick={toggleMute}
                      className="text-white hover:text-secondary transition-colors p-1"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted || volume === 0 ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : volume < 0.5 ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </motion.button>
                    <AnimatePresence>
                      {(showVolumeSlider || volume !== 1) && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 72, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 appearance-none bg-gray-600/50 rounded-full cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                              [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                            style={{
                              background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(75,85,99,0.5) ${(isMuted ? 0 : volume) * 100}%)`,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Playback Speed */}
                  <div className="relative">
                    <motion.button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="text-gray-300 hover:text-white transition-colors text-xs font-medium px-2 py-1 rounded hover:bg-white/10"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {playbackRate}x
                    </motion.button>
                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 py-1.5 min-w-[100px] overflow-hidden"
                        >
                          {PLAYBACK_SPEEDS.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => changePlaybackRate(speed)}
                              className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center justify-between gap-4 ${
                                playbackRate === speed
                                  ? "text-secondary bg-secondary/10"
                                  : "text-gray-300 hover:bg-gray-800"
                              }`}
                            >
                              <span>{speed}x</span>
                              {playbackRate === speed && (
                                <svg
                                  className="w-4 h-4 text-secondary"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Picture-in-Picture */}
                  <motion.button
                    onClick={togglePiP}
                    className="text-gray-300 hover:text-white transition-colors p-1 hidden sm:block"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Picture in Picture"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z" />
                    </svg>
                  </motion.button>

                  {/* Completion badge */}
                  {isCompleted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-400 text-xs font-medium px-2"
                    >
                      ✓
                    </motion.span>
                  )}

                  {/* Fullscreen */}
                  <motion.button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-secondary transition-colors p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isFullscreen ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ============================================ */}
          {/* Lecture Info */}
          {/* ============================================ */}
          <motion.div
            className="bg-white dark:bg-gray-900 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  {lecture.title}
                </h2>
                {lecture.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 whitespace-pre-line leading-relaxed">
                    {lecture.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 max-w-xs">
                <motion.div
                  className={`h-2 rounded-full ${
                    isCompleted
                      ? "bg-green-500"
                      : "bg-gradient-to-r from-secondary to-accent"
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                  layout
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {Math.round(progress)}%
              </span>
              {isCompleted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium"
                >
                  ተጠናቋል
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* ============================================ */}
          {/* Prev / Next Navigation */}
          {/* ============================================ */}
          <div className="bg-white dark:bg-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800">
            {prevLecture ? (
              <Link
                href={`/courses/${courseId}/lectures/${prevLecture.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-secondary transition-colors group"
              >
                <svg
                  className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden sm:inline">ያለፈው</span>
                <span className="truncate max-w-[120px] sm:max-w-[200px]">
                  {prevLecture.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextLecture ? (
              <Link
                href={`/courses/${courseId}/lectures/${nextLecture.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-secondary transition-colors group"
              >
                <span className="truncate max-w-[120px] sm:max-w-[200px]">
                  {nextLecture.title}
                </span>
                <span className="hidden sm:inline">ቀጣይ</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* Lecture Sidebar */}
        {/* ============================================ */}
        <div className="w-full lg:w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 lg:min-h-screen">
          <div className="sticky top-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                የኮርሱ ምዕራፎች
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {lectures?.lectures.length || 0} ምዕራፎች
              </p>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
              {lectures?.lectures.map((lec, i) => {
                const isActive = lec.id === lectureId;
                const lecProgress = lectures.progress[lec.id];
                const lecCompleted = lecProgress?.isCompleted || false;
                const lecPct = lecProgress?.watchPercentage || 0;

                return (
                  <Link
                    key={lec.id}
                    href={`/courses/${courseId}/lectures/${lec.id}`}
                    className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      isActive
                        ? "bg-primary/5 dark:bg-secondary/5 border-l-2 border-l-secondary"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${
                        lecCompleted
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : isActive
                            ? "bg-secondary text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {lecCompleted ? (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          isActive
                            ? "font-semibold text-primary dark:text-secondary"
                            : lecCompleted
                              ? "font-medium text-green-700 dark:text-green-400"
                              : "font-medium text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {lec.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDuration(lec.duration)}
                        </span>
                        {lecCompleted && (
                          <span className="text-xs text-green-500">ተጠናቋል</span>
                        )}
                        {!lecCompleted && lecPct > 0 && (
                          <span className="text-xs text-secondary">
                            {lecPct}%
                          </span>
                        )}
                      </div>
                      {!lecCompleted && lecPct > 0 && (
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1.5">
                          <div
                            className="bg-secondary h-1 rounded-full"
                            style={{ width: `${lecPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <svg
                        className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </Link>
                );
              })}

              {(!lectures?.lectures || lectures.lectures.length === 0) && (
                <div className="p-6 text-center">
                  <p className="text-gray-400 text-sm">ምንም ምዕራፎች የሉም</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Keyboard Shortcuts Modal */}
      {/* ============================================ */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-semibold">Keyboard Shortcuts</h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-400 hover:text-white transition-colors"
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
              <div className="p-6 space-y-3">
                {SHORTCUTS.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-300">{sc.desc}</span>
                    <kbd className="px-2.5 py-1 bg-gray-800 text-gray-200 text-xs font-mono rounded-lg border border-gray-700 min-w-[32px] text-center">
                      {sc.key === "Space" ? "␣" : sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-gray-800/50 text-center">
                <p className="text-xs text-gray-500">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] font-mono">
                    ?
                  </kbd>{" "}
                  anytime to toggle
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
