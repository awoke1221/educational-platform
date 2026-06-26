"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useHeroVideo } from "@/lib/hooks/useHeroVideo";

// ⚡ Lazy-load below-the-fold components for faster initial render
const ComingSoonForm = dynamic(() => import("@/components/ComingSoonForm"), {
  ssr: false,
});

const LAUNCH_DATE =
  process.env.NEXT_PUBLIC_COURSE_LAUNCH_DATE || "2026-09-01T00:00:00";

// ─── Enhanced Particle Background ────────────────────
function ParticleField({ count = 30 }: { count?: number }) {
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
          className={`absolute rounded-full ${i % 5 === 0 ? "bg-[#ef4444]/15" : i % 5 === 1 ? "bg-white/8" : "bg-white/12"}`}
          style={{
            left: `${(i * 17 + 3) % 100}%`,
            top: `${(i * 23 + 7) % 100}%`,
            width: (1 + (i % 3) * 0.5) * 3,
            height: (1 + (i % 3) * 0.5) * 3,
          }}
          animate={{
            y: [0, -20 - (i % 10), 0],
            x: i % 2 === 0 ? [0, 15, 0] : [0, -15, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 6) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Floating Geometric Orbs ─────────────────────────
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#dc2626]/8 to-[#ef4444]/3 blur-3xl animate-orb" />
      <motion.div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#7f1d1d]/10 to-transparent blur-3xl animate-orb-slow" />
      <motion.div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-[#ef4444]/5 via-[#dc2626]/5 to-transparent blur-3xl animate-orb-slower" />
      <motion.div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full border border-[#dc2626]/10 animate-spin-slow" />
      <motion.div
        className="absolute bottom-1/3 left-1/3 w-24 h-24 rounded-full border border-[#ef4444]/10 animate-spin-slow"
        style={{ animationDirection: "reverse" }}
      />
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const videoVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const, delay: 0.3 },
  },
};

// ─── Rotating Text Component (Typewriter Effect) ──────
function RotatingText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "dots" | "waiting">("typing");
  const dotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dots, setDots] = useState("");

  // Typewriter effect
  useEffect(() => {
    const fullText = phrases[index];
    let charIndex = 0;
    setText("");
    setPhase("typing");
    setDots("");

    const typingInterval = setInterval(
      () => {
        charIndex++;
        if (charIndex <= fullText.length) {
          setText(fullText.slice(0, charIndex));
        } else {
          clearInterval(typingInterval);
          setPhase("dots");
        }
      },
      60 + Math.random() * 40,
    ); // Varied typing speed for realism

    return () => clearInterval(typingInterval);
  }, [index, phrases]);

  // Blinking dots after typing
  useEffect(() => {
    if (phase !== "dots") {
      setDots("");
      return;
    }

    let dotCount = 0;
    const dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setDots(".".repeat(dotCount));
    }, 400);

    // After showing dots for 1.5s, move to next phrase
    const nextTimeout = setTimeout(() => {
      clearInterval(dotInterval);
      setPhase("waiting");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
      }, 300);
    }, 1500);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(nextTimeout);
    };
  }, [phase]);

  return (
    <div className="h-14 sm:h-16 md:h-20 flex items-center justify-center overflow-hidden">
      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight font-mono tracking-wide">
        <span className="bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#ef4444] bg-clip-text text-transparent">
          {text}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="inline-block w-[2px] h-[1em] bg-[#ef4444] ml-0.5 align-middle"
          />
        </span>
      </h1>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { heroVideo, heroLoading, videoRef: setHeroVideoRef } = useHeroVideo();

  const videoUrl = heroVideo?.videoUrl ?? null;
  const proxyUrl = heroVideo?.proxyUrl ?? null;
  const videoType = heroVideo?.type ?? "mp4";
  const videoPoster = heroVideo?.poster ?? "";
  const videoLoaded = !heroLoading;

  // Combine the hook's callback ref with our local ref for error handling
  const combinedVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      setHeroVideoRef(el);
    },
    [setHeroVideoRef],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Passive error logging — don't remove sources (let browser handle fallback)
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    console.warn(
      "[HeroVideo] CDN playback issue, browser will use fallback source if available",
    );
  }, []);

  // Memoize video player to prevent re-renders from destroying the <video> element
  const videoPlayerContent = useMemo(() => {
    if (!videoLoaded) {
      return (
        <div
          className="w-full max-h-[80vh] flex items-center justify-center bg-black/60"
          style={{ aspectRatio: "auto" }}
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-12 h-12 border-[3px] border-white/20 border-t-[#ef4444] rounded-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <span className="text-white/40 text-xs animate-pulse">
              Loading video...
            </span>
          </div>
        </div>
      );
    }

    if (videoUrl) {
      return (
        <div className="relative w-full max-h-[80vh] bg-black flex items-center justify-center">
          <video
            ref={combinedVideoRef}
            className="w-full max-h-[80vh] object-contain"
            controls
            playsInline
            preload="metadata"
            poster={videoPoster}
            onError={handleVideoError}
          >
            {/* 🐰 Primary: Direct Bunny CDN */}
            <source src={videoUrl} type={`video/${videoType}`} />
            {/* 🔄 Fallback: Proxy through server when CDN blocked */}
            {proxyUrl && <source src={proxyUrl} type={`video/${videoType}`} />}
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div
        className="w-full max-h-[80vh] flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a0a0a] text-white/40 text-sm"
        style={{ aspectRatio: "auto" }}
      >
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          Video unavailable
        </div>
      </div>
    );
  }, [
    videoLoaded,
    videoUrl,
    proxyUrl,
    videoType,
    videoPoster,
    handleVideoError,
  ]);

  return (
    <div>
      {/* Hero - Video Section */}
      <section className="relative bg-[#0a0a0a] text-white min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
        {/* Particles & Orbs */}
        <ParticleField count={40} />
        <FloatingOrbs />

        {/* Premium red glow accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#dc2626]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#7f1d1d]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-[#ef4444]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Gradient mesh overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #dc2626 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, #ef4444 0%, transparent 50%),
                            radial-gradient(circle at 40% 80%, #7f1d1d 0%, transparent 50%)`,
          }}
        />

        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl"
            animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-[#ef4444]/10 blur-3xl"
            animate={{ y: [0, 15, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/4 right-1/4 w-4 h-4 rounded-full bg-white/20 blur-sm"
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-[#ef4444]/30 blur-sm"
            animate={{ y: [0, 20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
          <motion.div
            className="absolute top-1/3 left-1/2 w-6 h-6 rounded-full bg-white/10 blur-md"
            animate={{ y: [0, -25, 0], x: [0, 10, 0] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <motion.div
            className="flex flex-col items-center gap-8 lg:gap-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Title & Rotating Text */}
            <motion.div
              className="text-center max-w-3xl"
              variants={itemVariants}
            >
              {/* Static top title - always visible, larger than rotating text */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-4"
              >
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-tight whitespace-nowrap">
                  Welcome to Adonay TikTok Academy
                </h1>
              </motion.div>

              {/* Rotating text */}
              <RotatingText
                phrases={[
                  "# ከ6 M+ followers",
                  "የፐርሰናል ብራንዲንግ Expert",
                  "Top TikTok",
                  "Learn",
                  "Create",
                  "Go Viral",
                ]}
              />
            </motion.div>

            {/* Video Player with animated gradient border */}
            <motion.div
              className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black gradient-border"
              variants={videoVariants}
              whileHover={{ scale: 1.01 }}
            >
              {videoPlayerContent}
            </motion.div>

            {/* ── Coming Soon Section ───────────────── */}
            <motion.div
              className="w-full max-w-2xl mx-auto"
              variants={itemVariants}
            >
              <div className="text-center space-y-6">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <span className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-[#ef4444]/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-[#ef4444]/10">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                    Adonay TikTok Academy
                  </span>
                </motion.div>

                {/* Coming Soon Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold"
                >
                  <span className="bg-gradient-to-r from-white via-white to-[#ef4444] bg-clip-text text-transparent">
                    ለመጀመር ዝግጁ ይሁኑ
                  </span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="text-white/60 text-sm max-w-md mx-auto"
                >
                  አዲሱ የ Adony TikTok Academy በቅርቡ ይጀምራል። ቀደም ብለው ይመዝገቡ እና ልዩ የሆኑ
                  ጥቅሞችን ያግኙ!
                </motion.p>

                {/* Coming Soon Registration Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                >
                  <ComingSoonForm source="homepage" launchDate={LAUNCH_DATE} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs text-white/40 tracking-widest uppercase">
            ወደ ታች ያስሱ
          </span>
          <motion.div
            className="w-5 h-8 border-2 border-white/20 rounded-full flex justify-center p-1"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
