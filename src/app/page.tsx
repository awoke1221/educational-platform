"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { env } from "@/config/env";

interface PromoData {
  url: string;
  streamingUrl: string;
  thumbnail: string;
  title: string;
}

function getPromoVideo(): PromoData | null {
  try {
    if (env.bunny.demoVideoUrl) {
      return {
        url: env.bunny.demoVideoUrl,
        streamingUrl: env.bunny.demoVideoUrl,
        thumbnail: env.bunny.demoVideoUrl,
        title: "AD LMS Promo Video",
      };
    }
    return null;
  } catch {
    return null;
  }
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

export default function Home() {
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setPromo(getPromoVideo());
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* Hero - Video Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary-light to-secondary text-white min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-primary/80 via-primary-light/60 to-secondary/40" />

        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl"
            animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-secondary/10 blur-3xl"
            animate={{ y: [0, 15, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/4 right-1/4 w-4 h-4 rounded-full bg-white/20 blur-sm"
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-secondary/30 blur-sm"
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
            {/* Title & Description */}
            <motion.div
              className="text-center max-w-3xl"
              variants={itemVariants}
            >
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                ከ6 ሚሊዮን በላይ ሰዎች የሚያውቁት{" "}
                <span className="text-gradient bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                  የፐርሰናል ብራንዲንግ
                </span>{" "}
                እና TikTok እድገት ባለሙያ
              </motion.h1>
              <motion.p
                className="text-base sm:text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                ቢሊዮኖች እይታዎችን ያመጡ ስልቶችን ይማሩ፣ ብራንድዎን ይገንቡ፣ እና ሰዎች ሊረሱት የማይችሉት ሰው
                ይሁኑ።
              </motion.p>
            </motion.div>

            {/* Video Player */}
            <motion.div
              className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black ring-4 ring-white/20 hover:ring-secondary/40 transition-all duration-500"
              variants={videoVariants}
              whileHover={{ scale: 1.01 }}
            >
              {promo ? (
                <video
                  className="w-full aspect-video"
                  controls
                  playsInline
                  poster={promo.thumbnail}
                >
                  <source src={promo.url} type="video/mp4" />
                  የእርስዎ ብራውዘር ቪዲዮ ማጫወት አይደግፍም።
                </video>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">
                  <div className="text-center p-8">
                    <motion.svg
                      className="w-16 h-16 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </motion.svg>
                    <p className="text-lg">የማስተዋወቂያ ቪዲዮ እየተጫነ ነው...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Promo video loading...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex justify-center mt-2 w-full max-w-md mx-auto"
              variants={itemVariants}
            >
              <Link
                href="/courses"
                className="group relative bg-secondary text-white px-8 py-3.5 rounded-lg text-center font-semibold transition-all shadow-lg hover:shadow-xl w-full overflow-hidden"
              >
                <span className="relative z-10">ኮርሶችን ይመልከቱ</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />
              </Link>
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
          <span className="text-xs text-white/60">ወደ ታች ያስሱ</span>
          <motion.div
            className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center p-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1.5 h-1.5 bg-secondary rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
