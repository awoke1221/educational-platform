"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
// 🚀 All animations replaced with pure CSS — no Framer Motion overhead

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

// 🚀 All Framer Motion variants removed — using pure CSS instead

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Hero - Video Section */}
      <section
        className="relative text-white min-h-dvh md:min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-[#0a0a0a]"
        style={{
          backgroundImage: "url('/background%20image%20.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Blur over the whole background image so text pops clearly */}
        <div className="absolute inset-0 pointer-events-none backdrop-blur-[3px]" />
        {/* Dark tint over whole section so text & animations stand out */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        {/* Top area — fades from darker at top to clear */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-transparent to-[55%] pointer-events-none" />
        {/* Bottom area — dark gradient + blur to hide background text */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-none backdrop-blur-[3px]" />
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
              <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col items-center gap-2 animate-bounce">
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

            {/* ── Coming Soon Section ───────────────── */}
            <div className="w-full max-w-2xl mx-auto mt-8 md:mt-12">
              <div className="text-center space-y-6">
                {/* Conditional Heading — subtle badge when registered, CTA when not */}
                {hasRegistered ? (
                  <div>
                    <span className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-[#ef4444]/15 text-white/50 text-xs font-semibold px-4 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      ተመዝግበዋል
                    </span>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      <span className="bg-gradient-to-r from-white via-white to-[#ef4444] bg-clip-text text-transparent">
                        20% ቅናሽ ያግኙ
                      </span>
                    </h2>

                    <p className="text-white/60 text-sm max-w-md mx-auto">
                      አሁን ይመዝገቡ እና 20% ቅናሽ ያግኙ!
                    </p>
                  </>
                )}

                {/* Coming Soon Registration Form */}
                <div>
                  <ComingSoonForm
                    source="homepage"
                    launchDate={LAUNCH_DATE}
                    onSuccess={handleRegistrationSuccess}
                  />
                </div>
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
