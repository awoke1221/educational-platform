"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExpandableDescriptionProps {
  text: string;
  maxLines?: number;
  className?: string;
  variant?: "dark" | "light";
}

export default function ExpandableDescription({
  text,
  maxLines = 2,
  className = "",
  variant = "dark",
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // ── Style presets ──────────────────────────────────────────
  const isDark = variant === "dark";

  const textColor = isDark ? "text-white/50" : "text-text-muted";
  const fadeFrom = isDark ? "#0a0a0a" : "#ffffff";
  const btnColor = isDark
    ? "text-[#ef4444] hover:text-[#ff6b6b]"
    : "text-primary hover:text-primary/70";

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      // Temporarily remove line-clamp to measure natural height
      el.style.webkitLineClamp = "unset";
      const fullHeight = el.scrollHeight;
      el.style.webkitLineClamp = String(maxLines);
      const clampedHeight = el.scrollHeight;

      setNeedsTruncation(fullHeight > clampedHeight + 1);

      // Restore expanded state if it was set
      el.style.webkitLineClamp = expanded ? "unset" : String(maxLines);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, maxLines, expanded]);

  const toggle = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <div className={`relative ${className}`}>
      <p
        ref={textRef}
        className={`text-sm leading-relaxed whitespace-pre-line ${textColor}`}
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? "unset" : maxLines,
          overflow: "hidden",
        }}
      >
        {text}
      </p>

      <AnimatePresence>
        {!expanded && needsTruncation && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${fadeFrom}, transparent)`,
            }}
          />
        )}
      </AnimatePresence>

      {needsTruncation && (
        <motion.button
          onClick={toggle}
          className={`mt-1.5 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${btnColor}`}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>{expanded ? "ያነሰ አሳይ" : "ሙሉውን አሳይ"}</span>
          <motion.svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={expanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
            />
          </motion.svg>
        </motion.button>
      )}
    </div>
  );
}
