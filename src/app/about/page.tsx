"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

/* ─── Types ─────────────────────────────────────────────── */
interface StatItem {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
  numValue?: number;
  decimals?: number;
}

interface ExpertiseItem {
  icon: string;
  title: string;
  desc: string;
}

/* ─── Data ──────────────────────────────────────────────── */
const heroStats: StatItem[] = [
  { value: "6", label: "ተከታዮች", suffix: "M+", numValue: 6, decimals: 0 },
  { value: "1.3", label: "እይታዎች", suffix: "B+", numValue: 1.3, decimals: 1 },
  { value: "2025", label: "TikToker of the Year", suffix: "" },
  {
    value: "1000",
    label: "የተሳካ ተማሪዎች",
    suffix: "+",
    numValue: 1000,
    decimals: 0,
  },
];

const expertiseAreas: ExpertiseItem[] = [
  {
    icon: "🎯",
    title: "ቫይራል ኮንቴንት ፍጠራ",
    desc: "በሚሊዮኖች የሚቆጠሩ እይታዎችን የሚያመጡ ኮንቴንቶችን የመፍጠር ስልቶች",
  },
  {
    icon: "⭐",
    title: "ፐርሰናል ብራንዲንግ",
    desc: "ጠንካራ የግል ብራንድ በመገንባት ዘላቂ ተፅዕኖ መፍጠር",
  },
  {
    icon: "📈",
    title: "የTikTok እድገት ስልቶች",
    desc: "ከዜሮ ወደ ሚሊዮኖች የሚወስዱ የተረጋገጡ የእድገት ስልቶች",
  },
  {
    icon: "👥",
    title: "አድማጭ ግንባታ",
    desc: "ታማኝ እና ንቁ ተከታዮችን የመገንባት ስነ-ጥበብ",
  },
  {
    icon: "🧠",
    title: "የኮንቴንት ሳይኮሎጂ",
    desc: "የሰዎችን ትኩረት የሚስቡ እና የሚያስቆዩ የስነ-ልቦና መርሆች",
  },
  {
    icon: "📖",
    title: "Storytelling",
    desc: "ማንኛውንም ታሪክ አስደናቂ እና የማይረሳ የማድረግ ጥበብ",
  },
  {
    icon: "🎬",
    title: "Camera Confidence",
    desc: "በካሜራ ፊት በራስ መተማመን እና ተፈጥሯዊ መሆን",
  },
  {
    icon: "💰",
    title: "Creator Monetization",
    desc: "ከማህበራዊ ሚዲያ ገቢ የማግኘት ስልቶች እና ስርዓቶች",
  },
  {
    icon: "🌍",
    title: "Digital Influence Building",
    desc: "በዲጂታል ዓለም ተፅዕኖ ፈጣሪ የመሆን ጉዞ",
  },
];

const timelineData = [
  {
    year: "ጅምር",
    title: "ጥያቄው ተጀመረ",
    desc: '"ሰዎች ለምን ይቆማሉ? ለምን ይመለከታሉ? ለምን ይከተላሉ?" — የአዶናይ ጉዞ በአንድ ጥያቄ ተጀምሯል።',
  },
  {
    year: "ጥናት",
    title: "ጥልቅ ምርምር",
    desc: "የሰው ስነ-ልቦና፣ የታሪክ አቀራረብ (Storytelling)፣ የኮሙኒኬሽን ጥበብ እና የቫይራል ኮንቴንት ምስጢር ላይ ለዓመታት ጥልቅ ምርምር አድርጓል።",
  },
  {
    year: "ውጤት",
    title: "728M እይታዎች በአንድ ወር",
    desc: "በአንድ ወር ውስጥ ከ728 ሚሊዮን በላይ እይታዎችን ማስመዝገብ ችሏል።",
  },
  {
    year: "መድረስ",
    title: "1.3B+ እይታዎች",
    desc: "በሁለት ወራት ውስጥ ይህ ቁጥር ከ1.3 ቢሊዮን በላይ ደርሷል።",
  },
  {
    year: "2025",
    title: "TikToker of the Year",
    desc: "በ2025 የዓመቱ ምርጥ TikToker ተብሎ ተሸልሟል፤ በአንድ ምሽት ብቻ 4 የተለያዩ ሽልማቶችን አግኝቷል።",
  },
  {
    year: "አሁን",
    title: "በሺዎች የሚቆጠሩ ተማሪዎች",
    desc: "በሺዎች የሚቆጠሩ ፈጣሪዎችን ከዜሮ በመነሳት በአጭር ጊዜ ውስጥ ሚሊዮኖች የሚቆጠሩ እይታዎችን እንዲያገኙ ረድቷል።",
  },
];

/* ─── Particles Background (client-side only) ──────────── */
function ParticleField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-secondary/20 blur-sm"
          style={{
            left: `${(i * 17 + 3) % 100}%`,
            top: `${(i * 23 + 7) % 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, i % 2 === 0 ? 15 : -15, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: 4 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 5) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Counter Card ─────────────────────────────────────── */
function CounterCard({
  value,
  label,
  suffix = "",
  prefix = "",
  numValue,
  decimals = 0,
  index = 0,
}: StatItem & { index?: number }) {
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:bg-white/10 transition-all duration-500 group-hover:border-secondary/30 group-hover:shadow-xl group-hover:shadow-secondary/5">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary mb-2">
            {prefix}
            <AnimatedCounter
              from={0}
              to={numValue ?? 0}
              duration={2500}
              suffix={suffix}
              decimals={decimals}
            />
          </div>
          <p className="text-white/70 text-sm sm:text-base">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Section Divider ──────────────────────────────────── */
function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
      <div className="w-2 h-2 rounded-full bg-secondary rotate-45" />
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
    </div>
  );
}

/* ─── Floating Badge ───────────────────────────────────── */
function FloatingBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 text-white/90 text-sm ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      {label}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-dark to-primary overflow-hidden">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        {/* Background Effects */}
        <ParticleField />
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-40 w-[30rem] h-[30rem] bg-accent/5 rounded-full blur-3xl" />
        </div>

        {/* Floating Badges */}
        <FloatingBadge
          label="TikToker of the Year 2025"
          className="top-32 right-8"
        />
        <FloatingBadge label="6M+ ተከታዮች" className="bottom-48 left-8" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/30 rounded-full px-4 py-1.5 text-secondary text-sm mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                በኢትዮጵያ ከፍተኛ ተፅዕኖ ፈጣሪ
              </motion.div>

              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                ስለ{" "}
                <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                  አዶናይ
                </span>
              </motion.h1>

              <motion.p
                className="text-xl sm:text-2xl text-white/80 font-light mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                ትኩረትን ወደ ተፅዕኖ፣ ተፅዕኖን ወደ ዕድል የሚቀይር ፈጣሪ
              </motion.p>

              <motion.p
                className="text-base sm:text-lg text-white/60 leading-relaxed max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                ከ6 ሚሊዮን በላይ ተከታዮችን በመገንባት እና ቢሊዮኖች የሚቆጠሩ እይታዎችን በማስመዝገብ፣ በኢትዮጵያ
                የዘመናዊ ዲጂታል ትውልድ ከፍተኛ ተፅዕኖ ፈጣሪዎች መካከል ስፍራውን አስመዝግቧል።
              </motion.p>

              {/* Hero Action Buttons */}
              <motion.div
                className="flex flex-wrap gap-4 mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Link
                  href="/courses"
                  className="group relative bg-secondary text-white px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-secondary/25 overflow-hidden"
                >
                  <span className="relative z-10">ኮርሶችን ይመልከቱ</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                </Link>
                <Link
                  href="/testimonials"
                  className="group relative bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 hover:bg-white/20 overflow-hidden"
                >
                  <span className="relative z-10">ምስክርነቶችን ይመልከቱ</span>
                </Link>
              </motion.div>

              {/* Mini Stats Row */}
              <motion.div
                className="flex gap-6 mt-10 pt-8 border-t border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                {[
                  { num: "6M+", label: "ተከታዮች" },
                  { num: "1.3B+", label: "እይታዎች" },
                  { num: "1000+", label: "ተማሪዎች" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xl font-bold text-secondary">
                      {stat.num}
                    </div>
                    <div className="text-xs text-white/50">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              className="relative flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <div className="relative w-full max-w-md">
                {/* Glow behind image */}
                <div className="absolute -inset-8 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent rounded-full blur-3xl" />

                {/* Image Container */}
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl group">
                  {/* Adonay Image */}
                  <img
                    src="/adonay image.jpg"
                    alt="አዶናይ"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />

                  {/* Image bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="bg-white/10 backdrop-blur-xl rounded-lg px-4 py-2 border border-white/10">
                      <p className="text-white font-semibold text-sm">አዶናይ</p>
                      <p className="text-white/60 text-xs">
                        የፐርሰናል ብራንዲንግ እና TikTok ባለሙያ
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className="w-5 h-8 border-2 border-white/20 rounded-full flex justify-center p-1"
            animate={{ opacity: [0.3, 1, 0.3] }}
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

      {/* ═══════════════ STATS SECTION ═══════════════ */}
      <section className="relative py-16 -mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {heroStats.map((stat, i) => (
              <CounterCard key={i} {...stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ STORY / JOURNEY SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              የአዶናይ{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                ጉዞ
              </span>
            </h2>
            <SectionDivider />
            <p className="text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
              አዶናይ በኢትዮጵያ ከፍተኛ ተፅዕኖ ካላቸው የዲጂታል ፈጣሪዎች፣ የፐርሰናል ብራንዲንግ አሰልጣኞች እና
              የማህበራዊ ሚዲያ ባለሙያዎች መካከል አንዱ ነው።
            </p>
          </AnimatedSection>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-secondary/40 via-secondary/20 to-transparent" />

            <div className="space-y-12 lg:space-y-16">
              {timelineData.map((item, i) => (
                <motion.div
                  key={i}
                  className={`relative flex flex-col lg:flex-row items-start gap-6 ${
                    i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-4 lg:left-1/2 w-4 h-4 -translate-x-1/2 rounded-full bg-secondary border-4 border-primary z-10 mt-1" />

                  {/* Content */}
                  <div
                    className={`ml-12 lg:ml-0 lg:w-[calc(50%-2rem)] ${
                      i % 2 === 0 ? "lg:pr-8 lg:text-right" : "lg:pl-8"
                    }`}
                  >
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-secondary/20 group">
                      <span className="inline-block text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1 mb-3">
                        {item.year}
                      </span>
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Empty column for alternating */}
                  <div className="hidden lg:block lg:w-[calc(50%-2rem)]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PHILOSOPHY SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {/* Decorative quotes */}
              <div className="absolute -top-8 -left-4 text-6xl text-secondary/20 font-serif leading-none">
                &ldquo;
              </div>
              <div className="absolute -bottom-12 -right-4 text-6xl text-secondary/20 font-serif leading-none">
                &rdquo;
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 lg:p-16">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-relaxed mb-6">
                  ሰዎች ኮንቴንትን አይከተሉም።{" "}
                  <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                    ሰዎችን ይከተላሉ።
                  </span>
                </p>
                <div className="w-16 h-0.5 bg-gradient-to-r from-secondary to-accent mx-auto mb-6" />
                <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto">
                  እውነተኝነት፣ ስሜት፣ ታሪክ አቀራረብ፣ እምነት እና ቀጣይነት የማንኛውም ጠንካራ ፐርሰናል ብራንድ
                  መሠረቶች ናቸው።
                </p>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════ TIKTOK ANALYTICS SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              የTikTok{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                አናሊቲክስ
              </span>
            </h2>
            <SectionDivider />
            <p className="text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
              በሚሊዮኖች የሚቆጠሩ ተከታዮች እና ቢሊዮኖች እይታዎች — የተረጋገጠ ውጤት
            </p>
          </AnimatedSection>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Analytics Image */}
            <AnimatedSection direction="left" className="order-2 lg:order-1">
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-secondary/10 via-accent/10 to-transparent rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <Image
                    src="/adoni titok analitics.jpeg"
                    alt="Adonay TikTok Analytics"
                    width={1200}
                    height={800}
                    className="w-full h-auto object-cover"
                    priority
                  />

                  {/* Overlay with stats on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                    <div className="p-6">
                      <div className="flex gap-4">
                        {[
                          { label: "እይታዎች", value: "1.3B+" },
                          { label: "ተከታዮች", value: "6M+" },
                          { label: "ልጥፎች", value: "2K+" },
                        ].map((s, i) => (
                          <div
                            key={i}
                            className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10"
                          >
                            <div className="text-lg font-bold text-secondary">
                              {s.value}
                            </div>
                            <div className="text-xs text-white/60">
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>

            {/* Analytics Details */}
            <AnimatedSection direction="right" className="order-1 lg:order-2">
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">📊</span>
                    <h3 className="text-xl font-bold text-white">
                      728 ሚሊዮን በላይ እይታዎች
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    በአንድ ወር ውስጥ ከ728 ሚሊዮን በላይ እይታዎችን ማስመዝገብ ችሏል። ይህ የሚያሳየው የእሱ
                    ኮንቴንት ምን ያህል ተፅዕኖ እንዳለው ነው።
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🚀</span>
                    <h3 className="text-xl font-bold text-white">
                      1.3 ቢሊዮን በላይ እይታዎች
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    በሁለት ወራት ውስጥ ይህ ቁጥር ከ1.3 ቢሊዮን በላይ ደርሷል። ይህ የእድገት ፍጥነት በኢትዮጵያ
                    ታይቶ የማይታወቅ ነው።
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🏆</span>
                    <h3 className="text-xl font-bold text-white">
                      TikToker of the Year 2025
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    በ2025 የዓመቱ ምርጥ TikToker ተብሎ ተሸልሟል፤ በአንድ ምሽት ብቻ 4 የተለያዩ
                    ሽልማቶችን ማግኘት ችሏል።
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🎓</span>
                    <h3 className="text-xl font-bold text-white">
                      1000+ የተሳካ ተማሪዎች
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    በሺዎች የሚቆጠሩ ፈጣሪዎችን ከዜሮ በመነሳት በአጭር ጊዜ ውስጥ ሚሊዮኖች የሚቆጠሩ እይታዎችን
                    እንዲያገኙ ረድቷል።
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══════════════ EXPERTISE SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/0 via-primary-light/20 to-primary/0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              የልዩ{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                ብቃት
              </span>{" "}
              መስኮች
            </h2>
            <SectionDivider />
            <p className="text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
              በ Adonay TikTok Academy አማካኝነት የሚማሯቸው ዘርፎች
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {expertiseAreas.map((area, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="relative group h-full"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 h-full hover:border-secondary/30 transition-all duration-300">
                    <span className="text-3xl mb-4 block">{area.icon}</span>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">
                      {area.title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {area.desc}
                    </p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══════════════ WHY LEARN SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              ለምን ሺዎች{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                ይማራሉ?
              </span>
            </h2>
            <SectionDivider />
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🎯",
                title: "በውጤት ላይ ያተኮረ",
                desc: "የአዶናይ ስልጠና በውጤት ላይ ያተኮረ ነው። ውስብስብ ቲዎሪዎችን አይጫንም።",
              },
              {
                icon: "⚡",
                title: "በቀጥታ ሊተገበሩ የሚችሉ",
                desc: "በቀጥታ ሊተገበሩ የሚችሉ ስልቶችን ያስተምራል። ተማሪዎቹ የሚማሩት ውጤት የሚያመጣ ስርዓት ነው።",
              },
              {
                icon: "🏆",
                title: "የተረጋገጠ ውጤት",
                desc: "እሱ ራሱ የተጠቀመባቸውን፣ የፈተናቸውን እና ውጤታቸውን ያረጋገጠባቸውን ስልቶች ብቻ ያስተምራል።",
              },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center hover:bg-white/10 transition-all duration-300 hover:border-secondary/20 group">
                  <motion.div
                    className="text-4xl mb-4"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {item.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-secondary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ MISSION SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-dark" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <motion.div
              className="bg-gradient-to-br from-secondary/10 via-accent/5 to-transparent border border-secondary/20 rounded-2xl p-8 sm:p-12 lg:p-16"
              whileHover={{ boxShadow: "0 0 40px rgba(201,149,42,0.1)" }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8">
                <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                  ተልዕኮው
                </span>
              </h2>

              <div className="space-y-4 text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                <p>የአዶናይ ተልዕኮ ሰዎችን ቫይራል ማድረግ ብቻ አይደለም።</p>
                <p className="text-white font-semibold text-xl sm:text-2xl">
                  የማይረሱ ሰዎች እንዲሆኑ ማገዝ ነው።
                </p>
              </div>

              <div className="w-16 h-0.5 bg-gradient-to-r from-secondary to-accent mx-auto my-8" />

              <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                {[
                  { icon: "✨", text: "ዕድሎችን ይፈጥራሉ" },
                  { icon: "🔥", text: "ተፅዕኖ ይገነባሉ" },
                  { icon: "🕊️", text: "ነፃነት ያገኛሉ" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10"
                    whileHover={{
                      y: -4,
                      backgroundColor: "rgba(255,255,255,0.1)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-white/70 text-sm font-medium">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl max-w-xl mx-auto">
                <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                  ትኩረትን መቆጣጠር ስትችል፣ ተከታዮችን ብቻ አትገነባም።
                </p>
                <p className="text-secondary font-bold text-lg sm:text-xl mt-2">
                  ዘላቂ ተፅዕኖ ትፈጥራለህ።
                </p>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════ CTA SECTION ═══════════════ */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/0 via-secondary/5 to-primary/0" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              ዛሬውኑ{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                ይጀምሩ
              </span>
            </h2>
            <SectionDivider />
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10">
              በአዶናይ የተረጋገጡ ስልቶችን በመማር የራስዎን ተፅዕኖ ይገንቡ
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/courses"
                className="group relative bg-secondary text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-secondary/25 overflow-hidden"
              >
                <span className="relative z-10">ኮርሶችን ይመልከቱ</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-accent to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />
              </Link>
              <Link
                href="/dashboard"
                className="group relative bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:bg-white/20 overflow-hidden"
              >
                <span className="relative z-10">ዳሽቦርድ</span>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════ FOOTER SPACING ═══════════════ */}
      <div className="h-4" />
    </div>
  );
}
