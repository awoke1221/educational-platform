"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  streamingUrl: string | null;
  signedVideoUrl: string | null;
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

const PROGRESS_INTERVAL = 15000; // Send progress every 15 seconds
const COMPLETION_THRESHOLD = 90; // Mark complete when 90% watched

// ============================================
// Helper: Format seconds to MM:SS
// ============================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================
// Main Component
// ============================================

export default function LecturePlayerPage() {
  const { courseId, lectureId } = useParams<{
    courseId: string;
    lectureId: string;
  }>();
  const router = useRouter();

  // State
  const [token, setToken] = useState<string>("");
  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [lectures, setLectures] = useState<CourseLectures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
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
      setError("እባክዎ ይግቡ");
      setLoading(false);
      return;
    }
    setToken(t);
  }, []);

  // ============================================
  // Fetch lecture data & check enrollment
  // ============================================

  useEffect(() => {
    if (!token || !lectureId) return;

    setLoading(true);
    setError("");

    // First check enrollment
    fetch(`/api/enrollments/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((enrData) => {
        // Check if enrolled by fetching enrollments
        return fetch(`/api/enrollments`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
      })
      .then((enrResult) => {
        const enrollments: Enrollment[] = enrResult.data?.data || [];
        const enrolled = enrollments.some(
          (e: any) => e.course?.id === courseId && e.status === "active",
        );
        setIsEnrolled(enrolled || false);
        return enrolled;
      })
      .catch(() => {
        // If enrollment check fails, try to load lecture anyway
        setIsEnrolled(false);
      })
      .then(() => {
        // Fetch lecture details
        return fetch(`/api/courses/${courseId}/lectures/${lectureId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
      })
      .then((lecData) => {
        if (!lecData.success) {
          setError(lecData.error || "ምዕራፍ አልተገኘም");
          return;
        }
        setLecture(lecData.data);
      })
      .catch((err) => {
        setError("መረጃ በመጫን ላይ ስህተት ተከስቷል");
        console.error("[LECTURE PLAYER] Fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [token, lectureId, courseId]);

  // ============================================
  // Fetch course lecture list for navigation
  // ============================================

  useEffect(() => {
    if (!token || !courseId) return;

    fetch(`/api/courses/${courseId}/lectures`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLectures(data.data);
        }
      })
      .catch(() => {});
  }, [token, courseId]);

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
  // Send progress update to API
  // ============================================

  const sendProgress = useCallback(
    async (time: number, pct: number, completed?: boolean) => {
      if (!token || !lectureId) return;

      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

      // Only send if progress changed significantly (>2%)
      if (
        Math.abs(pct - lastProgressRef.current.pct) > 2 ||
        time - lastProgressRef.current.time > 30
      ) {
        lastProgressRef.current = { time, pct };
        const shouldComplete = pct >= COMPLETION_THRESHOLD;
        if (shouldComplete) {
          setIsCompleted(true);
        }
        sendProgress(time, pct, shouldComplete);
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, sendProgress]);

  // ============================================
  // Video event handlers
  // ============================================

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    // Send final progress on pause
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      const pct = (time / dur) * 100;
      sendProgress(time, pct, pct >= COMPLETION_THRESHOLD);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsCompleted(true);
    if (videoRef.current) {
      sendProgress(videoRef.current.duration, 100, true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = async () => {
    const container = videoRef.current?.parentElement;
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

  // Auto-hide controls on mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

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
          toggleFullscreen();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "ArrowLeft":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 10,
            );
          }
          break;
        case "ArrowRight":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration || 0,
              videoRef.current.currentTime + 10,
            );
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  // ============================================
  // Loading State
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">በመጫን ላይ...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Error / Not Authenticated
  // ============================================

  if (error || !lecture) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {error || "ምዕራፍ አልተገኘም"}
          </h2>
          <p className="text-gray-500 mb-6">
            {!token
              ? "ይህን ቪዲዮ ለማየት በመጀመሪያ ይግቡ።"
              : "የተጠየቀው ምዕራፍ አልተገኘም ወይም ለእርስዎ የሚገኝ አይደለም።"}
          </p>
          <div className="flex gap-3 justify-center">
            {!token ? (
              <>
                <Link
                  href="/auth/login"
                  className="bg-[#1B2A4A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2C3E6B] transition-colors"
                >
                  ግባ
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-[#C9952A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#b8862a] transition-colors"
                >
                  ተመዝገብ
                </Link>
              </>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="bg-[#1B2A4A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2C3E6B] transition-colors"
              >
                ወደ ኮርሱ ተመለስ
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Not Enrolled
  // ============================================

  if (isEnrolled === false) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-500"
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">ኮርሱ አልተመዘገቡም</h2>
          <p className="text-gray-500 mb-6">ይህን ቪዲዮ ለማየት በመጀመሪያ ለኮርሱ ይመዝገቡ።</p>
          <Link
            href={`/courses/${courseId}`}
            className="bg-[#C9952A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#b8862a] transition-colors"
          >
            ወደ ኮርሱ ተመለስ
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // Main Player UI
  // ============================================

  const progress = currentTime && duration ? (currentTime / duration) * 100 : 0;
  const videoUrl =
    lecture.signedVideoUrl || lecture.streamingUrl || lecture.videoUrl;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
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
              {lecture.course.title} • ምዕራፍ {lecture.orderIndex + 1}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCompleted && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-green-900/50 text-green-400 text-xs px-3 py-1.5 rounded-full border border-green-800">
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
            </span>
          )}
          <Link
            href={`/progress/${courseId}`}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            እድገት
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* ============================================ */}
        {/* Video Player Section */}
        {/* ============================================ */}
        <div className="flex-1 lg:max-w-[calc(100%-380px)]">
          <div
            className="relative bg-black group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full aspect-video cursor-pointer bg-black"
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onClick={togglePlay}
              playsInline
              preload="metadata"
            />

            {/* Play Button Overlay (when paused) */}
            {!isPlaying && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity hover:bg-black/50"
                onClick={togglePlay}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#C9952A]/90 rounded-full flex items-center justify-center transition-transform hover:scale-110">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Bottom Controls Overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4 transition-opacity duration-300 ${
                showControls || !isPlaying ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Progress Bar (Seek) */}
              <div className="mb-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 appearance-none bg-gray-600 rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:bg-[#C9952A] [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:bg-[#C9952A] [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-0"
                  style={{
                    background: `linear-gradient(to right, #C9952A ${progress}%, #4B5563 ${progress}%)`,
                  }}
                />
              </div>

              {/* Control Buttons Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-[#C9952A] transition-colors"
                  >
                    {isPlaying ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Time Display */}
                  <span className="text-gray-300 text-xs font-mono tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Volume */}
                  <div className="flex items-center gap-1.5 group/vol">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-[#C9952A] transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
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
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/vol:w-20 transition-all duration-200 h-1 appearance-none bg-gray-600 rounded-full cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>

                  {/* Completion badge */}
                  {isCompleted && (
                    <span className="text-green-400 text-xs font-medium">
                      ✓ ተጠናቋል
                    </span>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-[#C9952A] transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* Lecture Info */}
          {/* ============================================ */}
          <div className="bg-white px-4 sm:px-6 py-5 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {lecture.title}
                </h2>
                {lecture.description && (
                  <p className="text-gray-600 text-sm mt-2 whitespace-pre-line leading-relaxed">
                    {lecture.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isCompleted ? "bg-green-500" : "bg-[#C9952A]"
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {Math.round(progress)}%
              </span>
              {isCompleted && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  ተጠናቋል
                </span>
              )}
            </div>
          </div>

          {/* ============================================ */}
          {/* Prev / Next Navigation */}
          {/* ============================================ */}
          <div className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            {prevLecture ? (
              <Link
                href={`/courses/${courseId}/lectures/${prevLecture.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B2A4A] transition-colors group"
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
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B2A4A] transition-colors group"
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
        <div className="w-full lg:w-[380px] bg-white border-l border-gray-200 lg:min-h-screen">
          <div className="sticky top-0">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">
                የኮርሱ ምዕራፎች
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
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
                    className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                      isActive
                        ? "bg-[#1B2A4A]/5 border-l-2 border-l-[#C9952A]"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Lecture Number / Status */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${
                        lecCompleted
                          ? "bg-green-100 text-green-700"
                          : isActive
                            ? "bg-[#C9952A] text-white"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lecCompleted ? "✓" : i + 1}
                    </div>

                    {/* Lecture Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          isActive
                            ? "font-semibold text-[#1B2A4A]"
                            : lecCompleted
                              ? "font-medium text-green-700"
                              : "font-medium text-gray-700"
                        }`}
                      >
                        {lec.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {lec.duration || 0} ደቂቃ
                        </span>
                        {lecCompleted && (
                          <span className="text-xs text-green-500">ተጠናቋል</span>
                        )}
                        {!lecCompleted && lecPct > 0 && (
                          <span className="text-xs text-[#C9952A]">
                            {lecPct}%
                          </span>
                        )}
                      </div>
                      {/* Mini progress bar */}
                      {!lecCompleted && lecPct > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                          <div
                            className="bg-[#C9952A] h-1 rounded-full"
                            style={{ width: `${lecPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <svg
                        className="w-4 h-4 text-[#C9952A] flex-shrink-0 mt-0.5"
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

              {/* Empty state */}
              {(!lectures?.lectures || lectures.lectures.length === 0) && (
                <div className="p-6 text-center">
                  <p className="text-gray-400 text-sm">ምንም ምዕራፎች የሉም</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
