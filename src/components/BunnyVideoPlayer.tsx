"use client";

// ============================================
// 🐰 Bunny Video Player Component (Bunny Stream HLS)
// ============================================
// Premium video player with:
// - HLS.js support for Bunny Stream adaptive bitrate streaming
// - Custom controls (play/pause, volume, seek)
// - Speed control (0.5x - 2x)
// - Picture-in-Picture
// - Fullscreen
// - Keyboard shortcuts
// - Progress tracking callback
// - Auto-resume
// ============================================

import { useRef, useEffect, useState, useCallback } from "react";
import Hls from "hls.js";

// ============================================
// Types
// ============================================

export interface BunnyVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  /** Callback when playback position changes */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback when video is ready to play */
  onReady?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Initial playback position (seconds) - for resume feature */
  startTime?: number;
  /** If true, saves/restores progress to localStorage */
  persistProgress?: boolean;
  /** Unique key for progress persistence */
  progressKey?: string;
  /** Show speed control */
  showSpeedControl?: boolean;
  /** Available playback speeds */
  speeds?: number[];
}

// ============================================
// Component
// ============================================

export default function BunnyVideoPlayer({
  src,
  poster,
  title,
  className = "",
  autoPlay = false,
  muted = false,
  onProgress,
  onEnded,
  onReady,
  onError,
  startTime,
  persistProgress = false,
  progressKey,
  showSpeedControl = true,
  speeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
}: BunnyVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // ============================================
  // Format time helper
  // ============================================

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ============================================
  // Video ref callbacks
  // ============================================

  const video = videoRef.current;

  // ============================================
  // Setup HLS.js for Bunny Stream + video event listeners
  // ============================================

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let hls: Hls | null = null;

    // Detect if src is an HLS stream (m3u8) for Bunny Stream
    const isHlsStream =
      src?.includes(".m3u8") || src?.includes("playlist.m3u8");

    if (isHlsStream && Hls.isSupported()) {
      // Use HLS.js for Bunny Stream adaptive bitrate HLS playback
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backbufferLength: 30,
        maxBufferLength: 30,
      });
      hls.loadSource(src);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        onReady?.();
        if (autoPlay) {
          el.play().catch(() => {});
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setHasError(true);
          setIsLoading(false);
          onError?.("HLS playback error: " + (data.type || "unknown"));
        }
      });
    } else {
      // Fallback: standard HTML5 video (for direct MP4 URLs)
      el.src = src;
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      onProgress?.(el.currentTime, el.duration || 0);
    };
    const onDurationChange = () => setDuration(el.duration || 0);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => {
      if (!isHlsStream || !hls) {
        setIsLoading(false);
        setHasError(false);
        onReady?.();
      }
    };
    const onEndedHandler = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const onErrorHandler = () => {
      if (!isHlsStream) {
        const msg = el.error?.message || "Video playback error";
        setHasError(true);
        setIsLoading(false);
        onError?.(msg);
      }
    };
    const onProgressEvent = () => {
      if (el.buffered.length > 0) {
        const end = el.buffered.end(el.buffered.length - 1);
        setBuffered(end);
      }
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEndedHandler);
    el.addEventListener("error", onErrorHandler);
    el.addEventListener("progress", onProgressEvent);

    // Set start time if provided
    if (startTime && startTime > 0) {
      el.currentTime = startTime;
    }

    // Restore persisted progress
    if (persistProgress && progressKey) {
      try {
        const saved = localStorage.getItem(`video-progress-${progressKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed?.currentTime &&
            (!duration || parsed.currentTime < duration - 5)
          ) {
            el.currentTime = parsed.currentTime;
          }
          localStorage.removeItem(`video-progress-${progressKey}`);
        }
      } catch {}
    }

    return () => {
      // Destroy HLS.js instance
      if (hls) {
        hls.destroy();
      }
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEndedHandler);
      el.removeEventListener("error", onErrorHandler);
      el.removeEventListener("progress", onProgressEvent);
    };
  }, [
    src,
    startTime,
    duration,
    persistProgress,
    progressKey,
    autoPlay,
    onProgress,
    onEnded,
    onReady,
    onError,
  ]);

  // ============================================
  // Persist progress periodically
  // ============================================

  useEffect(() => {
    if (!persistProgress || !progressKey) return;

    progressIntervalRef.current = setInterval(() => {
      const el = videoRef.current;
      if (el && !el.paused && el.duration > 0) {
        try {
          localStorage.setItem(
            `video-progress-${progressKey}`,
            JSON.stringify({
              currentTime: el.currentTime,
              duration: el.duration,
              updatedAt: Date.now(),
            }),
          );
        } catch {}
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [persistProgress, progressKey]);

  // ============================================
  // Auto-hide controls
  // ============================================

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSpeedMenu) setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, showSpeedMenu]);

  // ============================================
  // Controls
  // ============================================

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    if (el && el.duration) {
      el.currentTime = percent * el.duration;
    }
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = videoRef.current;
      const val = parseFloat(e.target.value);
      if (el) {
        el.volume = val;
        el.muted = val === 0;
        setVolume(val);
        setIsMuted(val === 0);
      }
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted && volume === 0) {
      el.volume = 0.5;
      setVolume(0.5);
    }
  }, [volume]);

  const changeSpeed = useCallback((speed: number) => {
    const el = videoRef.current;
    if (el) {
      el.playbackRate = speed;
      setPlaybackRate(speed);
    }
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await el.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await el.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch {}
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Listen for PiP changes
  useEffect(() => {
    const enterHandler = () => setIsPiP(true);
    const leaveHandler = () => setIsPiP(false);
    const video = videoRef.current;
    if (video) {
      video.addEventListener("enterpictureinpicture", enterHandler);
      video.addEventListener("leavepictureinpicture", leaveHandler);
      return () => {
        video.removeEventListener("enterpictureinpicture", enterHandler);
        video.removeEventListener("leavepictureinpicture", leaveHandler);
      };
    }
  }, []);

  // ============================================
  // Keyboard shortcuts
  // ============================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = videoRef.current;
      if (!el) return;

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
          el.currentTime = Math.max(0, el.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          el.currentTime = Math.min(el.duration, el.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          el.volume = Math.min(1, el.volume + 0.1);
          setVolume(el.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          el.volume = Math.max(0, el.volume - 0.1);
          setVolume(el.volume);
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, toggleFullscreen, toggleMute]);

  // ============================================
  // Progress percentage
  // ============================================

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // ============================================
  // Render
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-xl overflow-hidden ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{ width: "100%", aspectRatio: "16/9" }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
        preload="metadata"
        muted={isMuted}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center text-white px-6">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm font-medium">Video playback error</p>
            <button
              onClick={() => {
                const el = videoRef.current;
                if (el) {
                  setHasError(false);
                  el.load();
                }
              }}
              className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
            <svg
              className="w-7 h-7 text-gray-900 ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
            style={{ width: `${bufferedPercent}%` }}
          />
          <div
            className="absolute top-0 left-0 h-full bg-secondary rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-secondary rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-secondary transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time Display */}
          <span className="text-white/80 text-xs font-mono min-w-[90px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={toggleMute}
              className="text-white hover:text-secondary transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
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
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-secondary h-1"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Title (on mobile: hidden) */}
          {title && (
            <span className="text-white/60 text-xs hidden sm:block truncate max-w-[200px]">
              {title}
            </span>
          )}

          {/* Speed Control */}
          {showSpeedControl && (
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white/80 hover:text-secondary text-xs font-medium px-2 py-1 rounded transition-colors"
                title="Playback speed"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1 min-w-[80px]">
                  {speeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        playbackRate === speed
                          ? "text-secondary bg-white/10"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picture-in-Picture */}
          <button
            onClick={togglePiP}
            className="text-white/80 hover:text-secondary transition-colors hidden sm:block"
            title="Picture-in-Picture"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 14h4v4h-4z"
              />
            </svg>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-secondary transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
