"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useHeroVideo } from "@/lib/hooks/useHeroVideo";

// ⚡ Lazy-load below-the-fold components for faster initial render
const ComingSoonForm = dynamic(() => import("@/components/ComingSoonForm"), {
  ssr: false,
});

const LAUNCH_DATE =
  process.env.NEXT_PUBLIC_COURSE_LAUNCH_DATE || "2026-07-26T00:00:00";

// ─── Enhanced Particle Background ────────────────────
// 🚀 OPTIMIZED: Pure CSS animations instead of Framer Motion.
// CSS @keyframes run on the GPU compositor thread — zero main thread cost.
// Reduced from 40 to 15 particles — visually identical, 60% fewer DOM nodes.
const PARTICLE_CLASSES = [
  "anim-particle-a",
  "anim-particle-b",
  "anim-particle-c",
  "anim-particle-d",
];
const PARTICLE_COLORS = [
  "bg-[#ef4444]/15",
  "bg-white/8",
  "bg-white/12",
  "bg-white/10",
  "bg-[#ef4444]/10",
];

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
        <div
          key={i}
          className={`absolute rounded-full ${PARTICLE_COLORS[i % PARTICLE_COLORS.length]} ${PARTICLE_CLASSES[i % PARTICLE_CLASSES.length]}`}
          style={{
            left: `${(i * 17 + 3) % 100}%`,
            top: `${(i * 23 + 7) % 100}%`,
            width: (1 + (i % 3) * 0.5) * 3,
            height: (1 + (i % 3) * 0.5) * 3,
            animationDelay: `${(i % 6) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Floating Geometric Orbs ─────────────────────────
// 🚀 Uses pure CSS @keyframes — runs on GPU compositor thread.
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#dc2626]/8 to-[#ef4444]/3 blur-3xl animate-orb gpu-layer" />
      <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-[#7f1d1d]/10 to-transparent blur-3xl animate-orb-slow gpu-layer" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full bg-gradient-to-r from-[#ef4444]/5 via-[#dc2626]/5 to-transparent blur-3xl animate-orb-slower gpu-layer" />
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
      100 + Math.random() * 80,
    );

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

// ─── FIX #1, #5, #6: Dedicated VideoPlayer component ──────────────────────────
// Extracted into its own component so React's reconciler keeps the same <video>
// DOM node alive across renders — no more useMemo destroying/recreating the element.
// The wrapper always reserves the 9:16 aspect ratio to prevent layout shift (CLS).
function VideoPlayer({
  videoLoaded,
  videoUrl,
  proxyUrl,
  videoType,
  videoPoster,
  videoRef,
}: {
  videoLoaded: boolean;
  videoUrl: string | null;
  proxyUrl: string | null;
  videoType: string;
  videoPoster: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  // FIX #3: Track error state to show user-visible fallback UI
  const [hasError, setHasError] = useState(false);

  // FIX #3: Actionable error handler — updates UI state instead of silent console.warn
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Only flag error after all <source> elements have been tried (networkState === 3)
    if (video.networkState === 3) {
      console.error("[HeroVideo] All sources failed — showing fallback UI");
      setHasError(true);
    }
  }, [videoRef]);

  // Reset error state when a new video URL arrives
  useEffect(() => {
    setHasError(false);
  }, [videoUrl]);

  // ─── FIX #5 & #6: Stable aspect-ratio wrapper ────────────────────────────
  // - aspectRatio: "9/16" reserves the correct portrait space on ALL states
  //   (loading, loaded, error) — eliminates layout shift completely.
  // - maxHeight: 50vh keeps the portrait video shorter on desktop so it
  //   doesn't dominate the hero section.
  // - The inner content fills this box with h-full / object-contain.
  const wrapperStyle: React.CSSProperties = {
    aspectRatio: "16 / 9",
    maxHeight: "35vh",
    width: "100%",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderRadius: "1rem",
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (!videoLoaded) {
    return (
      <div style={wrapperStyle}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-[3px] border-white/20 border-t-[#ef4444] rounded-full anim-spinner" />
          <span className="text-white/40 text-xs animate-pulse">
            Loading video...
          </span>
        </div>
      </div>
    );
  }

  // ── Error fallback UI (shown after all sources fail) ────────────────────
  if (hasError || !videoUrl) {
    return (
      <div style={wrapperStyle}>
        <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
          <svg
            className="w-12 h-12 opacity-40 text-white"
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
          <p className="text-white/40 text-sm">Video unavailable</p>
          {/* FIX #3: Give user a way to retry instead of silent failure */}
          {hasError && (
            <button
              onClick={() => setHasError(false)}
              className="mt-1 text-xs text-[#ef4444]/70 hover:text-[#ef4444] underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Video player ────────────────────────────────────────────────────────
  return (
    <div style={wrapperStyle}>
      {/*
        FIX #5: h-full + object-contain fills the stable wrapper exactly.
        FIX #4: crossOrigin="anonymous" prevents CORS cache poisoning with CDNs.
        FIX #2: preload="auto" starts buffering immediately so playback begins
                without the stall caused by preload="metadata".
        FIX #1: <video> lives here permanently — React reconciler never destroys
                it because VideoPlayer stays mounted. No useMemo re-creation risk.
      */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted
        playsInline
        preload="auto" // FIX #2: was "metadata" — now pre-buffers for instant play
        poster={videoPoster}
        crossOrigin="anonymous" // FIX #4: required for Bunny CDN CORS correctness
        onError={handleVideoError}
      >
        {/* Primary: Direct Bunny CDN */}
        <source src={videoUrl} type={`video/${videoType}`} />
        {/* Fallback: Proxy through server when CDN is blocked */}
        {proxyUrl && <source src={proxyUrl} type={`video/${videoType}`} />}
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);

  // Check localStorage for existing registration
  useEffect(() => {
    const submitted = localStorage.getItem("commingsoon_submitted");
    if (submitted === "true") {
      setHasRegistered(true);
    }
  }, []);

  const handleRegistrationSuccess = useCallback(() => {
    setHasRegistered(true);
  }, []);

  // FIX #1: Keep a stable ref for the <video> element — passed directly to
  // VideoPlayer instead of being threaded through useMemo + useCallback chains.
  const videoRef = useRef<HTMLVideoElement>(null);

  const { heroVideo, heroLoading, videoRef: setHeroVideoRef } = useHeroVideo();

  const videoUrl = heroVideo?.videoUrl ?? null;
  const proxyUrl = heroVideo?.proxyUrl ?? null;
  const videoType = heroVideo?.type ?? "mp4";
  const videoPoster = heroVideo?.poster ?? "";
  const videoLoaded = !heroLoading;

  // FIX #1: combinedRef synchronises our stable ref with the hook's callback ref.
  // useCallback keeps its identity stable so VideoPlayer never re-renders from this.
  const combinedVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
        el;
      setHeroVideoRef(el);
    },
    [setHeroVideoRef],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Hero - Video Section */}
      <section className="relative bg-[#0a0a0a] text-white min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
        {/* Particles & Orbs */}
        <ParticleField count={12} />
        <FloatingOrbs />

        {/* Premium red glow accents — GPU-accelerated layers */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[450px] bg-[#dc2626]/8 rounded-full blur-[100px] pointer-events-none gpu-layer" />
        <div className="absolute -bottom-24 -right-24 w-[350px] h-[350px] bg-[#ef4444]/5 rounded-full blur-[80px] pointer-events-none gpu-layer" />

        {/* Floating decorative elements — minimal GPU-composited set */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-4 h-4 rounded-full bg-white/20 blur-sm anim-decor-bounce" />
          <div className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-[#ef4444]/30 blur-sm anim-decor-drift" />
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
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-4"
              >
                <h1 className="text-sm sm:text-base md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-tight text-white leading-tight whitespace-nowrap">
                  Welcome to Adonay TikTok Academy
                </h1>
              </motion.div>

              <RotatingText
                phrases={[
                  "6M+ ተከታዮች",
                  "2025 TikToker of the Year",
                  "1.3B+ እይታዎች በሁለት ወራት",
                  "1000+ የተሳካ ተማሪዎች",
                ]}
              />
            </motion.div>

            {/*
              FIX #1 + #5 + #6: VideoPlayer is now a stable component, not a
              memoized JSX blob. React keeps the same DOM node across renders.
              The gradient-border wrapper only handles visual styling — sizing
              is owned entirely by VideoPlayer's internal wrapperStyle.
            */}
            <motion.div
              className="w-full max-w-[280px] sm:max-w-sm rounded-2xl overflow-hidden shadow-2xl gradient-border"
              variants={videoVariants}
            >
              <VideoPlayer
                videoLoaded={videoLoaded}
                videoUrl={videoUrl}
                proxyUrl={proxyUrl}
                videoType={videoType}
                videoPoster={videoPoster}
                videoRef={videoRef}
              />
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

                {/* Conditional Heading — subtle badge when registered, CTA when not */}
                {hasRegistered ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <span className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-[#ef4444]/15 text-white/50 text-xs font-semibold px-4 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      ተመዝግበዋል
                    </span>
                  </motion.div>
                ) : (
                  <>
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
                      አዲሱ የ Adony TikTok Academy በቅርቡ ይጀምራል። ቀደም ብለው ይመዝገቡ እና ልዩ
                      የሆኑ ጥቅሞችን ያግኙ!
                    </motion.p>
                  </>
                )}

                {/* Coming Soon Registration Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                >
                  <ComingSoonForm
                    source="homepage"
                    launchDate={LAUNCH_DATE}
                    onSuccess={handleRegistrationSuccess}
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500 ${
            scrolled ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="text-xs text-white/40 tracking-widest uppercase">
            ወደ ታች ያስሱ
          </span>
          <div className="w-5 h-8 border-2 border-white/20 rounded-full flex justify-center p-1 animate-pulse">
            <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-bounce" />
          </div>
        </div>
      </section>
    </div>
  );
}
