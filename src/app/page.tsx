"use client";

import { useEffect, useState } from "react";
// 🚀 All animations replaced with pure CSS — no Framer Motion overhead

// 🚀 All Framer Motion variants removed — using pure CSS instead

// 🎬 Trailer Video Player with Bunny Stream Embed
const TRAILER_VIDEO_ID = process.env.NEXT_PUBLIC_TRAILER_VIDEO_ID || "";

function TrailerVideoPlayer() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!TRAILER_VIDEO_ID) {
      setHasError(true);
    }
  }, []);

  if (hasError || !TRAILER_VIDEO_ID) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
        <div className="text-center">
          <svg
            className="w-10 h-10 mx-auto mb-2 opacity-50"
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
          <p>Set NEXT_PUBLIC_TRAILER_VIDEO_ID env var</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        src={`https://iframe.mediadelivery.net/embed/695187/${TRAILER_VIDEO_ID}?autoplay=true&loop=true&muted=true`}
        className="w-full h-full absolute inset-0"
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Adonay Documentary"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative text-white min-h-dvh md:min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-[#0a0a0a]">
        {/* Dark gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40 pointer-events-none" />
        {/* Subtle red glow accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#a30000]/10 blur-[120px] pointer-events-none gpu-layer" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center gap-8 lg:gap-10">
            {/* ─── Premium Hero Title with 3D Tilt (pure CSS, zero JS) ─── */}
            <div
              className="text-center w-full max-w-full overflow-visible"
              style={{ perspective: "800px" }}
            >
              {/* ── "Welcome to" with decorative side lines ── */}
              <div
                className="flex items-center justify-center gap-3 sm:gap-5 mb-3 sm:mb-4"
                style={{
                  transform: "rotateX(6deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="w-10 sm:w-16 h-px bg-gradient-to-r from-transparent via-[#ef4444]/30 to-transparent" />
                <span
                  className="relative text-[11px] sm:text-xs md:text-sm tracking-[0.35em] uppercase text-white/90 italic"
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontWeight: 700,
                    textShadow: "0 0 12px rgba(239,68,68,0.4)",
                  }}
                >
                  Welcome to
                  <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#ef4444]/60 to-transparent" />
                </span>
                <div className="w-10 sm:w-16 h-px bg-gradient-to-r from-transparent via-[#ef4444]/30 to-transparent" />
              </div>

              {/* ── Main 3D Title with decorative accents ── */}
              <div
                className="relative inline-block pb-5 max-w-full"
                style={{
                  transform: "rotateX(8deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <h1
                  className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black leading-none tracking-tight"
                  style={{
                    color: "#fff",
                    textShadow: [
                      // 3D extrusion layers — reduced on mobile
                      "0 1px 0 #e8e8e8",
                      "0 2px 0 #c8c8c8",
                      "0 3px 0 #a8a8a8",
                      "0 4px 0 #888888",
                      "0 5px 0 #686868",
                      "0 6px 0 #484848",
                      "0 8px 3px rgba(0,0,0,.2)",
                      // Red glow aura — stronger for mobile visibility
                      "0 0 15px rgba(239,68,68,.5)",
                      "0 0 35px rgba(239,68,68,.15)",
                      // Depth
                      "0 4px 12px rgba(0,0,0,.25)",
                    ].join(","),
                  }}
                >
                  <span
                    className="bg-gradient-to-r from-white via-[#fcd34d] to-[#ef4444] bg-clip-text text-transparent italic"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    Adonay TikTok Academy
                  </span>
                </h1>

                {/* Decorative gradient underlines — tilted to match */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#ef4444]/50 to-transparent"
                  style={{ transform: "rotateX(8deg)" }}
                />
                <div
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-px rounded-full bg-gradient-to-r from-transparent via-[#fcd34d]/30 to-transparent"
                  style={{ transform: "rotateX(8deg)" }}
                />
              </div>

              {/* ── Premium Downward Arrow ── */}
              <div className="mt-16 sm:mt-20 md:mt-24 mb-8 sm:mb-12 flex flex-col items-center gap-2 animate-bounce">
                {/* Glowing circle backdrop */}
                <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#ef4444]/20 to-transparent blur-md" />
                  <div className="absolute inset-[2px] rounded-full border border-[#ef4444]/30" />
                  {/* Double chevron */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    className="relative sm:w-6 sm:h-6"
                  >
                    <path
                      d="M4 6l7 7 7-7"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 12l7 7 7-7"
                      stroke="#f87171"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.6"
                    />
                  </svg>
                </div>
                {/* Pulse dot */}
                <div className="w-1 h-1 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            </div>

            {/* 🎬 Trailer Video — immediately below the arrow */}
            <div className="w-full max-w-md mx-auto mt-4 sm:mt-6 md:mt-8">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 shadow-lg shadow-[#a30000]/20 border border-white/5">
                <TrailerVideoPlayer />
              </div>
            </div>
          </div>
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
