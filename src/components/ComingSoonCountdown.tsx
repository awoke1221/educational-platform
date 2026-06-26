"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type CountdownVariant = "large" | "small" | "banner";

interface Props {
  targetDate: string;
  variant?: CountdownVariant;
  onComplete?: () => void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────

function calcTimeLeft(target: string): TimeLeft & { total: number } {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ─── Labels in Amharic + English ────────────────────────

const LABELS: Record<string, { am: string; en: string }> = {
  days: { am: "ቀናት", en: "Days" },
  hours: { am: "ሰዓታት", en: "Hours" },
  minutes: { am: "ደቂቃዎች", en: "Mins" },
  seconds: { am: "ሰከንዶች", en: "Secs" },
};

// ─── Animated Digit ──────────────────────────────────────

function AnimatedDigit({ value, label }: { value: number; label: string }) {
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    setFlip(true);
    const t = setTimeout(() => setFlip(false), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative overflow-hidden">
        <motion.div
          key={value}
          initial={{ y: 20, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`
            font-bold tracking-wider tabular-nums text-center
            bg-black/60 backdrop-blur-md rounded-xl
            border border-[#ef4444]/30 shadow-lg shadow-[#ef4444]/10
            ${
              label === "days"
                ? "text-4xl sm:text-5xl md:text-6xl px-6 py-3 sm:px-8 sm:py-4 min-w-[100px]"
                : "text-3xl sm:text-4xl md:text-5xl px-4 py-3 sm:px-6 sm:py-4 min-w-[80px]"
            }
          `}
        >
          <span className="bg-gradient-to-b from-[#ef4444] to-[#dc2626] bg-clip-text text-transparent">
            {pad(value)}
          </span>
        </motion.div>
        {/* Red shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#ef4444]/10 to-transparent rounded-xl pointer-events-none" />
      </div>
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-[#ef4444]/70">
        {label}
      </span>
    </div>
  );
}

// ─── Separator ───────────────────────────────────────────

function Separator() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 pb-6">
      <div className="w-2 h-2 rounded-full bg-[#ef4444]/60 shadow-sm shadow-[#ef4444]/30" />
      <div className="w-2 h-2 rounded-full bg-[#ef4444]/60 shadow-sm shadow-[#ef4444]/30" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function ComingSoonCountdown({
  targetDate,
  variant = "large",
  onComplete,
  className = "",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [expired, setExpired] = useState(false);

  // Initialize on client only — prevents hydration mismatch
  useEffect(() => {
    const r = calcTimeLeft(targetDate);
    setTimeLeft({
      days: r.days,
      hours: r.hours,
      minutes: r.minutes,
      seconds: r.seconds,
    });
    setMounted(true);
  }, [targetDate]);

  const tick = useCallback(() => {
    const r = calcTimeLeft(targetDate);
    setTimeLeft({
      days: r.days,
      hours: r.hours,
      minutes: r.minutes,
      seconds: r.seconds,
    });
    if (r.total <= 0) {
      setExpired(true);
      onComplete?.();
    }
  }, [targetDate, onComplete]);

  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tick, mounted]);

  // Don't render anything during SSR to avoid hydration mismatch
  if (!mounted) {
    return <div className={className} />;
  }

  // ── Expired state ──────────────────────────────────
  if (expired) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 text-2xl sm:text-3xl font-bold text-white bg-[#ef4444]/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-[#ef4444]/40 shadow-lg shadow-[#ef4444]/20">
          <span>🎉</span>
          <span>ተጀምሯል!</span>
          <span>🚀</span>
        </span>
      </motion.div>
    );
  }

  // ── Banner variant (text-only inline) ──────────────
  if (variant === "banner") {
    return (
      <div
        className={`flex items-center justify-center gap-2 text-sm font-semibold ${className}`}
      >
        <span className="text-[#ef4444]">🚀</span>
        <span className="text-white/80">
          በ{" "}
          <span className="text-[#ef4444] font-bold text-base drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            {timeLeft.days}
          </span>{" "}
          ቀናት ውስጥ ይጀምራል
        </span>
        <span className="text-white/40 text-xs tabular-nums">
          ({pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          )
        </span>
      </div>
    );
  }

  // ── Small variant (compact boxes) ───────────────────
  if (variant === "small") {
    return (
      <div
        className={`flex items-center justify-center gap-2 sm:gap-3 ${className}`}
      >
        {(["days", "hours", "minutes", "seconds"] as const).map((key, i) => (
          <div key={key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-black/60 backdrop-blur-md rounded-lg border border-[#ef4444]/30 px-3 py-2 min-w-[52px] text-center shadow-lg shadow-[#ef4444]/10">
                <span className="text-xl sm:text-2xl font-bold text-[#ef4444] tabular-nums">
                  {pad(timeLeft[key])}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#ef4444]/60 font-bold mt-1">
                {LABELS[key].am}
              </span>
            </div>
            {i < 3 && (
              <span className="text-white/30 text-lg font-light -mt-5">:</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Large variant (homepage) — full sporty look ────
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={`flex items-center justify-center gap-1 sm:gap-3 ${className}`}
    >
      {(["days", "hours", "minutes", "seconds"] as const).map((key, i) => (
        <div key={key} className="flex items-center gap-1 sm:gap-3">
          <AnimatedDigit value={timeLeft[key]} label={LABELS[key].am} />
          {i < 3 && <Separator />}
        </div>
      ))}
    </motion.div>
  );
}
