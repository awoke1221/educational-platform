"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeProvider";

interface ThemeSwitchProps {
  /** If true, renders as a labeled row (for mobile menu). If false, renders as a standalone icon button (for navbar). */
  labeled?: boolean;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

/**
 * Advanced animated theme toggle switch with spring physics.
 * Dual-mode: renders as a labeled toggle row or a compact icon button.
 * Accessible with proper ARIA attributes and keyboard support.
 */
export default function ThemeSwitch({
  labeled = false,
  size = "md",
}: ThemeSwitchProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const trackWidth = size === "sm" ? 36 : size === "lg" ? 52 : 44;
  const knobSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const knobOffset = size === "sm" ? 18 : size === "lg" ? 26 : 22;

  if (labeled) {
    return (
      <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-white/5 border border-[#a30000]/10">
        <span className="text-sm font-medium text-white/70">
          {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </span>
        <button
          onClick={toggleTheme}
          className="relative rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          style={{ width: trackWidth, height: knobSize + 4 }}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          role="switch"
          aria-checked={isDark}
        >
          {/* Track */}
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{ backgroundColor: isDark ? "#a30000" : "#e2e8f0" }}
            transition={{ duration: 0.2 }}
          />
          {/* Knob */}
          <motion.span
            className="absolute top-[2px] bg-white rounded-full shadow-md flex items-center justify-center overflow-hidden"
            style={{ width: knobSize, height: knobSize }}
            animate={{ x: isDark ? trackWidth - knobSize - 2 : 2 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <AnimatedIcon isDark={isDark} size={size} />
          </motion.span>
        </button>
      </div>
    );
  }

  // Compact icon button mode (for desktop navbar)
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      role="switch"
      aria-checked={isDark}
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {isDark ? (
          <svg
            className="w-5 h-5 text-secondary group-hover:text-secondary transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-white/80 group-hover:text-secondary transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </motion.div>
    </button>
  );
}

/** Small animated icon inside the switch knob */
function AnimatedIcon({
  isDark,
  size,
}: {
  isDark: boolean;
  size: "sm" | "md" | "lg";
}) {
  const iconSize = size === "sm" ? 10 : size === "lg" ? 14 : 12;

  return (
    <motion.svg
      key={isDark ? "moon-icon" : "sun-icon"}
      initial={{ rotate: -90, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={isDark ? "text-gray-600" : "text-amber-500"}
      width={iconSize}
      height={iconSize}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      {isDark ? (
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      ) : (
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clipRule="evenodd"
        />
      )}
    </motion.svg>
  );
}
