"use client";

import { motion } from "framer-motion";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SegmentedToggleProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** @default "default" */
  variant?: "default" | "cards";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  name?: string;
}

/**
 * Advanced segmented toggle / pill toggle with animated highlight.
 * Two variants:
 * - "default": Compact pill-style segmented control
 * - "cards": Card-based toggle with descriptions (for payment method selection)
 * Fully accessible with ARIA radio group pattern.
 */
export default function SegmentedToggle<T extends string = string>({
  options,
  value,
  onChange,
  variant = "default",
  size = "md",
  name,
}: SegmentedToggleProps<T>) {
  if (variant === "cards") {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role="radiogroup"
        aria-label={name || "Selection"}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className="relative rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 overflow-hidden group"
            >
              {/* Animated background */}
              <motion.span
                className="absolute inset-0"
                initial={false}
                animate={{
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(201,149,42,0.12), rgba(212,168,67,0.06))"
                    : "transparent",
                }}
                transition={{ duration: 0.2 }}
              />

              {/* Selection indicator ring */}
              <motion.span
                className="absolute inset-0 rounded-2xl"
                initial={false}
                animate={{
                  borderColor: isSelected ? "#a30000" : "transparent",
                  borderWidth: isSelected ? 2 : 0,
                }}
                transition={{ duration: 0.2 }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  {/* Icon circle */}
                  <motion.span
                    className="inline-flex h-9 w-9 rounded-full items-center justify-center text-white text-sm font-bold shrink-0"
                    animate={{
                      background: isSelected
                        ? "linear-gradient(135deg, #a30000, #d40000)"
                        : "linear-gradient(135deg, #1b2a4a, #2c3e6b)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {opt.icon || opt.label.charAt(0).toUpperCase()}
                  </motion.span>
                  <div>
                    <motion.h3
                      className="font-semibold text-sm"
                      animate={{
                        color: isSelected ? "#a30000" : "inherit",
                      }}
                    >
                      {opt.label}
                    </motion.h3>
                    {opt.description && (
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    )}
                  </div>

                  {/* Checkmark */}
                  <motion.span
                    className="ml-auto"
                    initial={false}
                    animate={{
                      scale: isSelected ? 1 : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    }}
                  >
                    <svg
                      className="w-5 h-5 text-secondary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {opt.description || ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Default pill-style segmented control ──
  const sizeStyles = {
    sm: { py: "py-1.5", px: "px-3", text: "text-xs" },
    md: { py: "py-2", px: "px-4", text: "text-sm" },
    lg: { py: "py-2.5", px: "px-5", text: "text-base" },
  };
  const sz = sizeStyles[size];

  return (
    <div
      className="relative inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1"
      role="radiogroup"
      aria-label={name || "Selection"}
    >
      {/* Sliding highlight */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-gray-700 shadow-sm"
        layoutId={`segmented-highlight-${name || "default"}`}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        style={{
          left: `${(options.findIndex((o) => o.value === value) / options.length) * 100}%`,
          width: `${100 / options.length}%`,
        }}
      />

      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 ${sz.py} ${sz.px} ${sz.text} font-medium rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 whitespace-nowrap ${
              isSelected
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
