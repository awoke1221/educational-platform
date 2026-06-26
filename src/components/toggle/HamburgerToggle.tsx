"use client";

import { motion } from "framer-motion";

interface HamburgerToggleProps {
  isOpen: boolean;
  onClick: () => void;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Color when open */
  activeColor?: string;
  /** Color when closed */
  inactiveColor?: string;
  ariaLabel?: string;
}

const sizeMap = {
  sm: { w: 16, h: 12, barH: 1.5 },
  md: { w: 20, h: 16, barH: 2 },
  lg: { w: 24, h: 20, barH: 2.5 },
};

/**
 * Advanced animated hamburger-to-X toggle with spring physics.
 * Fully accessible, supports custom sizing and colors.
 */
export default function HamburgerToggle({
  isOpen,
  onClick,
  size = "md",
  activeColor = "#a30000",
  inactiveColor = "#ffffffcc",
  ariaLabel = "Toggle navigation menu",
}: HamburgerToggleProps) {
  const s = sizeMap[size];
  const mid = s.h / 2 - s.barH / 2;

  const spring = {
    type: "spring" as const,
    stiffness: 400,
    damping: 24,
  };

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      style={{ width: 40, height: 40 }}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
    >
      {/* Ripple */}
      <motion.span
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={
          isOpen
            ? { scale: 1, opacity: 0.12, backgroundColor: activeColor }
            : { scale: 0, opacity: 0 }
        }
        transition={{ duration: 0.3 }}
      />

      <div className="relative" style={{ width: s.w, height: s.h }}>
        {/* Top bar */}
        <motion.span
          className="absolute block rounded-full origin-center"
          style={{
            height: s.barH,
            width: "100%",
            borderRadius: 9999,
            left: 0,
            top: 0,
          }}
          animate={
            isOpen
              ? {
                  rotate: 45,
                  top: mid,
                  backgroundColor: activeColor,
                }
              : {
                  rotate: 0,
                  top: 0,
                  backgroundColor: inactiveColor,
                }
          }
          transition={spring}
        />

        {/* Middle bar */}
        <motion.span
          className="absolute block rounded-full origin-center"
          style={{
            height: s.barH,
            width: "100%",
            borderRadius: 9999,
            left: 0,
            top: mid,
          }}
          animate={
            isOpen
              ? { opacity: 0, x: -10, backgroundColor: activeColor }
              : { opacity: 1, x: 0, backgroundColor: inactiveColor }
          }
          transition={spring}
        />

        {/* Bottom bar */}
        <motion.span
          className="absolute block rounded-full origin-center"
          style={{
            height: s.barH,
            width: "100%",
            borderRadius: 9999,
            left: 0,
            bottom: 0,
          }}
          animate={
            isOpen
              ? {
                  rotate: -45,
                  bottom: mid,
                  backgroundColor: activeColor,
                }
              : {
                  rotate: 0,
                  bottom: 0,
                  backgroundColor: inactiveColor,
                }
          }
          transition={spring}
        />
      </div>
    </button>
  );
}
