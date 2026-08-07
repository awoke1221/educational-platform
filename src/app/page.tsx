"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HeroVideoData {
  embedUrl?: string;
  hlsUrl?: string;
  poster?: string;
  thumbnailUrl?: string;
}

function TrailerVideoPlayer() {
  const [heroVideo, setHeroVideo] = useState<HeroVideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHeroVideo() {
      try {
        const response = await fetch("/api/bunny/hero-video");
        if (!response.ok) {
          throw new Error(`Hero video API returned ${response.status}`);
        }

        const json = await response.json();
        if (!json.success || !json.data || !json.data.embedUrl) {
          throw new Error(json.message || "No hero video available");
        }

        if (!cancelled) {
          setHeroVideo(json.data);
        }
      } catch (error) {
        console.warn("Hero video loading failed:", error);
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHeroVideo();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          bg-black/80
        "
      >
        <p className="text-white/60 text-sm">Loading intro video...</p>
      </div>
    );
  }

  if (hasError || !heroVideo?.embedUrl) {
    return (
      <div
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          bg-black/80
        "
      >
        <p className="text-white/60 text-sm">Intro video unavailable</p>
      </div>
    );
  }

  return (
    <iframe
      src={`${heroVideo.embedUrl}?autoplay=true&loop=true&muted=true`}
      className="absolute inset-0 w-full h-full"
      loading="lazy"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      title="Adonay Documentary"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      className="
        min-h-screen
        bg-[#050505]
        text-white
        overflow-hidden
      "
    >
      <section
        className="
          relative
          min-h-screen
          flex
          items-center
          justify-center
          px-5
          sm:px-8
        "
      >
        {/* Background */}

        <div className="absolute inset-0">
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-br
              from-[#25DCEB]/10
              via-black
              to-[#FF3B6B]/20
            "
          />

          {/* Cyan Glow */}

          <div
            className="
              absolute
              top-10
              left-10
              w-96
              h-96
              rounded-full
              bg-[#25DCEB]/20
              blur-[150px]
              animate-pulse
            "
          />

          {/* Pink Glow */}

          <div
            className="
              absolute
              bottom-10
              right-10
              w-96
              h-96
              rounded-full
              bg-[#FF3B6B]/20
              blur-[150px]
            "
          />
        </div>

        <div
          className="
            relative
            z-10
            w-full
            max-w-6xl
            text-center
          "
          style={{
            perspective: "900px",
          }}
        >
          {/* Welcome Text */}

          <div
            className="
              flex
              justify-center
              mb-4
            "
          >
            <span
              className="
                text-xs
                sm:text-sm
                tracking-[0.45em]
                uppercase
                text-[#D9D9D9]
                italic
              "
            >
              Welcome to
            </span>
          </div>

          {/* 3D Academy Title */}

          <div
            className="
              relative
              inline-block
              pb-6
            "
            style={{
              transform: "rotateX(8deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <h1
              className="
                text-4xl
                sm:text-5xl
                md:text-7xl
                lg:text-8xl
                font-black
                tracking-tight
              "
              style={{
                textShadow: `
                0 2px 0 rgba(255,255,255,.15),
                0 5px 20px rgba(37,220,235,.25),
                0 0 40px rgba(255,59,107,.25)
                `,
              }}
            >
              <span
                className="
                  bg-gradient-to-r
                  from-[#25DCEB]
                  via-[#D9D9D9]
                  to-[#FF3B6B]
                  bg-clip-text
                  text-transparent
                  italic
                "
              >
                Adonay TikTok Academy
              </span>
            </h1>

            {/* Tagline */}

            <p
              className="
                mt-6
                text-sm
                sm:text-lg
                md:text-xl
                font-bold
                tracking-[0.3em]
                uppercase
                bg-gradient-to-r
                from-[#25DCEB]
                via-[#D9D9D9]
                to-[#FF3B6B]
                bg-clip-text
                text-transparent
              "
            >
              Learn • Create • Grow • Go Viral
            </p>

            {/* Animated Line */}

            <div
              className="
                relative
                mt-7
                mx-auto
                h-[3px]
                w-3/4
                overflow-hidden
                rounded-full
                bg-white/10
              "
            >
              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-r
                  from-transparent
                  via-[#25DCEB]
                  to-[#FF3B6B]
                  animate-pulse
                "
              />
            </div>
          </div>

          {/* Animated Arrow */}

          <div
            className="
              mt-16
              flex
              flex-col
              items-center
              gap-3
              animate-bounce
            "
          >
            <div
              className="
                relative
                w-12
                h-12
                rounded-full
                flex
                items-center
                justify-center
                border
                border-[#25DCEB]/50
                bg-[#25DCEB]/10
                shadow-[0_0_25px_rgba(37,220,235,.4)]
              "
            >
              <svg width="25" height="25" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4 6l7 7 7-7"
                  stroke="#25DCEB"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M4 12l7 7 7-7"
                  stroke="#FF3B6B"
                  strokeWidth="2"
                  opacity=".8"
                />
              </svg>
            </div>
          </div>

          {/* Video */}

          <div
            className="
              max-w-xl
              mx-auto
              mt-10
            "
          >
            <div
              className="
                relative
                aspect-video
                rounded-2xl
                overflow-hidden
                bg-black
                border
                border-[#25DCEB]/40
                shadow-[0_0_60px_rgba(37,220,235,.2)]
              "
            >
              <TrailerVideoPlayer />
            </div>
            {/* Continue Learning CTA */}

            <div className="mt-8 flex justify-center">
              <Link
                href="/courses"
                className="
      group
      relative
      inline-flex
      items-center
      gap-3
      px-8
      py-4
      rounded-full
      font-bold
      text-white
      bg-gradient-to-r
      from-[#25DCEB]
      via-[#1bb9d0]
      to-[#FF3B6B]
      shadow-[0_0_35px_rgba(37,220,235,.35)]
      hover:shadow-[0_0_60px_rgba(255,59,107,.45)]
      hover:scale-105
      transition-all
      duration-300
      overflow-hidden
    "
              >
                <span
                  className="
        absolute
        inset-0
        bg-white/20
        translate-x-[-100%]
        group-hover:translate-x-[100%]
        transition-transform
        duration-700
      "
                />

                <span className="relative z-10">Continue Learning</span>

                <svg
                  className="
        relative
        z-10
        w-5
        h-5
        group-hover:translate-x-1
        transition-transform
      "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}

        <div
          className={`
            absolute
            bottom-8
            left-1/2
            -translate-x-1/2
            transition-opacity
            duration-500
            ${scrolled ? "opacity-0" : "opacity-100"}
          `}
        >
          <div
            className="
              w-6
              h-10
              border
              border-[#D9D9D9]/30
              rounded-full
              flex
              justify-center
              pt-2
            "
          >
            <div
              className="
                w-1.5
                h-1.5
                rounded-full
                bg-[#FF3B6B]
                animate-bounce
              "
            />
          </div>
        </div>
      </section>
    </div>
  );
}
