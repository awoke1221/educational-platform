"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CACHE_KEY = "hero-video-cache";
const PLAYBACK_KEY = "hero-video-playback";

interface HeroVideoData {
  videoUrl: string;
  poster: string;
  filename: string;
  type: string;
  storagePath: string;
}

interface CacheEntry {
  data: HeroVideoData;
  timestamp: number;
}

interface PlaybackState {
  currentTime: number;
  wasPlaying: boolean;
}

/**
 * Custom hook that fetches the hero video once and caches it in sessionStorage.
 * Also preserves the video playback position so the video doesn't restart from
 * the beginning when navigating back to the home page.
 *
 * This prevents re-fetching the video every time the user navigates back to the
 * home page, since Next.js App Router unmounts/remounts page components on navigation.
 *
 * The cache lives for the duration of the browser tab session (sessionStorage).
 */
export function useHeroVideo() {
  const [heroVideo, setHeroVideo] = useState<HeroVideoData | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch / restore cached video data
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Try reading from sessionStorage cache first
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CacheEntry = JSON.parse(cached);
          // Use cache if it's less than 30 minutes old
          const isFresh = Date.now() - parsed.timestamp < 30 * 60 * 1000;
          if (isFresh && parsed.data) {
            if (!cancelled) {
              setHeroVideo(parsed.data);
              setHeroLoading(false);
              return;
            }
          }
        }

        // 2. No valid cache — fetch from API
        const res = await fetch("/api/bunny/hero-video");
        const json = await res.json();
        if (!cancelled) {
          if (json.success && json.data) {
            setHeroVideo(json.data);
            // Store in sessionStorage
            const entry: CacheEntry = {
              data: json.data,
              timestamp: Date.now(),
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
          }
        }
      } catch (err) {
        console.error("Failed to load hero video:", err);
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save playback position periodically and on unmount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const savePlayback = () => {
      const state: PlaybackState = {
        currentTime: video.currentTime,
        wasPlaying: !video.paused,
      };
      sessionStorage.setItem(PLAYBACK_KEY, JSON.stringify(state));
    };

    // Save every 2 seconds while playing
    const interval = setInterval(savePlayback, 2000);

    // Save on unmount (when navigating away)
    return () => {
      clearInterval(interval);
      savePlayback();
    };
  }, [heroVideo]);

  // Restore playback position once video metadata is loaded
  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      videoRef.current = el;

      const saved = sessionStorage.getItem(PLAYBACK_KEY);
      if (saved) {
        try {
          const state: PlaybackState = JSON.parse(saved);

          // Restore position once we have metadata
          const onLoaded = () => {
            if (state.currentTime > 0) {
              el.currentTime = state.currentTime;
            }
            if (state.wasPlaying) {
              el.play().catch(() => {});
            }
          };

          if (el.readyState >= 1) {
            onLoaded();
          } else {
            el.addEventListener("loadedmetadata", onLoaded, { once: true });
          }
        } catch {
          // Ignore corrupt playback state
        }
      }
    } else {
      videoRef.current = null;
    }
  }, []);

  return { heroVideo, heroLoading, videoRef: handleVideoRef };
}
