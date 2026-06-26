"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import ComingSoonCountdown from "./ComingSoonCountdown";

// ─── Types ───────────────────────────────────────────────

type Step = "idle" | "location" | "form" | "submitting" | "success";

interface Props {
  source?: "homepage" | "courses" | "register";
  launchDate: string;
}

// ─── Form State ──────────────────────────────────────────

interface FormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
}

// ─── Animation Variants ──────────────────────────────────

const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const overlayBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const overlayPanel: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.25 },
  },
};

// ─── Color Classes ───────────────────────────────────────
// Inspired by the premium red sports car theme
// Racing red (Rosso Corsa) on black backgrounds

const RED_GRADIENT = "from-[#7f1d1d] via-[#dc2626] to-[#ef4444]";
const RED_GRADIENT_HOVER = "from-[#991b1b] via-[#e60000] to-[#ff3333]";
const RED_BG_GLOW =
  "bg-gradient-to-br from-[#7f1d1d]/30 via-[#dc2626]/15 to-[#ef4444]/10";
const RED_BORDER = "border-[#dc2626]/40";
const RED_TEXT = "text-[#ef4444]";
const RED_RING = "focus:ring-[#dc2626]/40 focus:border-[#dc2626]";

// ─── Gender Options ──────────────────────────────────────

const GENDERS = [
  { value: "male", label: "ወንድ", labelEn: "Male" },
  { value: "female", label: "ሴት", labelEn: "Female" },
  { value: "other", label: "ሌላ", labelEn: "Other" },
];

// ═══════════════════════════════════════════════════════════
// OVERLAY WRAPPER — Full‑screen immersive modal
// ═══════════════════════════════════════════════════════════

function ComingSoonOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          variants={overlayBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Animated gradient orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#ef4444]/10 blur-[120px] pointer-events-none"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#dc2626]/8 blur-[150px] pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg"
            variants={overlayPanel}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="relative bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Top red accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ef4444] to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all duration-200 group"
              >
                <svg
                  className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="p-6 sm:p-8">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ComingSoonForm({
  source = "homepage",
  launchDate,
}: Props) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [locationType, setLocationType] = useState<"local" | "diaspora" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
  });

  // Check localStorage for existing submission
  useEffect(() => {
    const submitted = localStorage.getItem("commingsoon_submitted");
    if (submitted === "true") {
      setHasSubmitted(true);
      setStep("success");
    }
  }, []);

  // ── Overlay helpers ─────────────────────────────────

  const openOverlay = useCallback(() => {
    setOverlayOpen(true);
    // Reset to location step each time overlay opens
    setStep("location");
    setLocationType(null);
    setError("");
    setForm({ fullName: "", email: "", phoneNumber: "", gender: "" });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setStep("idle");
    setLocationType(null);
    setError("");
    setForm({ fullName: "", email: "", phoneNumber: "", gender: "" });
  }, []);

  const openOverlayFromSuccess = useCallback(() => {
    setStep("success");
    setOverlayOpen(true);
  }, []);

  // ── Handlers ────────────────────────────────────────

  const handleLocationSelect = (type: "local" | "diaspora") => {
    setLocationType(type);
    setStep("form");
    setError("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.fullName.trim()) {
      setError("እባክዎ ሙሉ ስም ያስገቡ");
      return;
    }
    if (!form.gender) {
      setError("እባክዎ ጾታ ይምረጡ");
      return;
    }
    if (locationType === "diaspora" && !form.email.trim()) {
      setError("እባክዎ ኢሜይል ያስገቡ");
      return;
    }
    if (locationType === "local" && !form.phoneNumber.trim()) {
      setError("እባክዎ ስልክ ቁጥር ያስገቡ");
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/commingsoon/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          gender: form.gender,
          locationType,
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Save to localStorage so returning visitors see success screen
      localStorage.setItem("commingsoon_submitted", "true");
      localStorage.setItem("commingsoon_name", form.fullName.trim());

      setHasSubmitted(true);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "እባክዎ እንደገና ይሞክሩ");
      setStep("form");
    }
  };

  const handleBack = () => {
    setStep("location");
    setError("");
  };

  // ── Render: CTA button (not yet registered) ─────────

  if (!overlayOpen && !hasSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <motion.button
          onClick={openOverlay}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            group relative w-full overflow-hidden rounded-xl
            bg-gradient-to-r ${RED_GRADIENT}
            text-white font-bold text-base sm:text-lg
            px-8 py-4
            shadow-lg shadow-[#dc2626]/30
            hover:shadow-xl hover:shadow-[#dc2626]/50
            transition-all duration-300
          `}
        >
          {/* Animated shine overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Pulsing border glow */}
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-[#ef4444]/0"
            animate={{
              borderColor: [
                "rgba(239,68,68,0)",
                "rgba(239,68,68,0.3)",
                "rgba(239,68,68,0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="relative z-10 flex items-center justify-center gap-3">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            ቀደም ብለው ይመዝገቡ
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </span>
        </motion.button>
      </div>
    );
  }

  // ── Render: Inline success card (registered, overlay closed) ──

  if (!overlayOpen && hasSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative rounded-2xl overflow-hidden"
        >
          {/* Animated pulsing border */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(239,68,68,0)",
                "0 0 0 2px rgba(239,68,68,0.3)",
                "0 0 0 0 rgba(239,68,68,0)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main card */}
          <div className="relative bg-gradient-to-br from-[#7f1d1d]/25 via-[#dc2626]/12 to-[#ef4444]/8 backdrop-blur-xl rounded-2xl border border-[#ef4444]/25 p-6 shadow-xl shadow-[#dc2626]/15 overflow-hidden">
            {/* Red glow orbs */}
            <motion.div
              className="absolute -top-24 -right-24 w-48 h-48 bg-[#ef4444]/15 rounded-full blur-[100px] pointer-events-none"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#dc2626]/12 rounded-full blur-[100px] pointer-events-none"
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Decorative ring */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-dashed border-[#ef4444]/20"
              animate={{ rotate: [0, 360], scale: [1, 1.05, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />

            <div className="relative z-10 text-center space-y-5">
              {/* Animated icon with rings */}
              <div className="relative flex justify-center mb-2">
                {/* Outer glow */}
                <motion.div
                  className="absolute w-20 h-20 rounded-full bg-[#ef4444]/15 blur-xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Black ring next to icon */}
                <motion.div
                  className="absolute w-[76px] h-[76px] rounded-full border-[3px] border-black/60"
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#7f1d1d]/40 to-[#dc2626]/20 border-2 border-[#ef4444]/40 flex items-center justify-center shadow-lg shadow-[#ef4444]/20"
                >
                  <motion.svg
                    className="w-8 h-8 text-[#ef4444]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </motion.svg>
                </motion.div>
              </div>

              {/* Thank you */}
              <div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-white mb-1"
                >
                  <span className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] bg-clip-text text-transparent">
                    ተመዝግበዋል!
                  </span>{" "}
                  ✅
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-white/60 leading-relaxed"
                >
                  ኮርሱ ሲጀመር እናሳውቅዎታለን።
                </motion.p>
              </div>

              {/* Red divider */}
              <motion.div
                className="w-16 h-0.5 bg-gradient-to-r from-[#ef4444]/50 via-[#dc2626]/30 to-transparent mx-auto rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              />

              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-xs text-[#ef4444]/70 font-bold mb-3 tracking-[0.15em] uppercase">
                  እስከሚጀመር ያለው ጊዜ
                </p>
                <ComingSoonCountdown targetDate={launchDate} variant="small" />
              </motion.div>

              {/* Bottom message with shine */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="relative"
              >
                <p className="text-xs text-white/40">እስከዚያ ድረስ ይጠብቁን! 🚀</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Overlay open ─────────────────────────────

  return (
    <>
      <ComingSoonOverlay open={overlayOpen} onClose={closeOverlay}>
        <AnimatePresence mode="wait">
          {/* ── LOCATION: Local vs Diaspora Choice ──────── */}
          {step === "location" && (
            <motion.div
              key="location"
              variants={fadeSlideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7f1d1d]/40 to-[#dc2626]/20 border border-[#ef4444]/30 mb-2"
                >
                  <span className="text-2xl">🚀</span>
                </motion.div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  ቀደም ብለው ይመዝገቡ
                </h2>
                <p className="text-sm text-white/50 max-w-xs mx-auto">
                  አዲሱን Adony TikTok Academy በቅርቡ ይጀምራል። የት ይኖራሉ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Local */}
                <motion.button
                  onClick={() => handleLocationSelect("local")}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    group relative flex flex-col items-center gap-3
                    p-6 sm:p-7 rounded-xl
                    bg-white/[0.06] backdrop-blur-md
                    border border-white/10
                    hover:border-[#ef4444]/60
                    hover:bg-white/[0.1]
                    transition-all duration-300
                    shadow-lg overflow-hidden
                  `}
                >
                  {/* Hover glow */}
                  <motion.div className="absolute -inset-20 bg-[#ef4444]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className="text-4xl relative z-10">📍</span>
                  <div className="text-center relative z-10">
                    <p className="text-white font-bold text-base">Local</p>
                    <p className="text-[#ef4444]/60 text-xs font-medium">
                      ኢትዮጵያ
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ef4444]/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </motion.button>

                {/* Diaspora */}
                <motion.button
                  onClick={() => handleLocationSelect("diaspora")}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className={`
                    group relative flex flex-col items-center gap-3
                    p-6 sm:p-7 rounded-xl
                    bg-white/[0.06] backdrop-blur-md
                    border border-white/10
                    hover:border-[#ef4444]/60
                    hover:bg-white/[0.1]
                    transition-all duration-300
                    shadow-lg overflow-hidden
                  `}
                >
                  <motion.div className="absolute -inset-20 bg-[#ef4444]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className="text-4xl relative z-10">🌍</span>
                  <div className="text-center relative z-10">
                    <p className="text-white font-bold text-base">Diaspora</p>
                    <p className="text-[#ef4444]/60 text-xs font-medium">
                      ውጭ ሀገር
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ef4444]/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── FORM: Dynamic based on location ─────────── */}
          {["form", "submitting"].includes(step) && (
            <motion.div
              key="form"
              variants={fadeSlideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <motion.button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </motion.button>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]/50" />
                  <span className="w-6 h-[2px] bg-gradient-to-r from-[#ef4444]/50 to-white/20" />
                  <span className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="w-6 h-[2px] bg-white/10" />
                  <span className="w-2 h-2 rounded-full bg-white/10" />
                </div>
                <span className="text-xs font-medium text-[#ef4444]/60">
                  {locationType === "local" ? "📍 ኢትዮጵያ" : "🌍 ውጭ ሀገር"}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name — always required */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    ሙሉ ስም / Full Name <span className={RED_TEXT}>*</span>
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="ሙሉ ስምዎን ያስገቡ"
                    className={`
                      w-full px-4 py-3 rounded-lg text-sm
                      bg-white/5 backdrop-blur-md
                      border border-white/10 text-white
                      placeholder-white/25
                      ${RED_RING}
                      outline-none transition-all duration-200
                      focus:bg-white/[0.07] focus:border-[#ef4444]/50
                    `}
                    required
                  />
                </div>

                {/* Dynamic field: Email for diaspora, Phone for local */}
                {locationType === "diaspora" ? (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      ኢሜይል / Email <span className={RED_TEXT}>*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className={`
                        w-full px-4 py-3 rounded-lg text-sm
                        bg-white/5 backdrop-blur-md
                        border border-white/10 text-white
                        placeholder-white/25
                        ${RED_RING}
                        outline-none transition-all duration-200
                        focus:bg-white/[0.07] focus:border-[#ef4444]/50
                      `}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      ስልክ ቁጥር / Phone Number <span className={RED_TEXT}>*</span>
                    </label>
                    <input
                      name="phoneNumber"
                      type="tel"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      placeholder="+251 91 111 1111"
                      className={`
                        w-full px-4 py-3 rounded-lg text-sm
                        bg-white/5 backdrop-blur-md
                        border border-white/10 text-white
                        placeholder-white/25
                        ${RED_RING}
                        outline-none transition-all duration-200
                        focus:bg-white/[0.07] focus:border-[#ef4444]/50
                      `}
                      required
                    />
                  </div>
                )}

                {/* Gender — always required */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    ጾታ / Gender <span className={RED_TEXT}>*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={`
                      w-full px-4 py-3 rounded-lg text-sm appearance-none
                      bg-white/5 backdrop-blur-md
                      border border-white/10 text-white
                      ${RED_RING}
                      outline-none transition-all duration-200
                      focus:bg-white/[0.07] focus:border-[#ef4444]/50
                    `}
                    required
                  >
                    <option
                      value=""
                      disabled
                      className="text-gray-400 bg-gray-900"
                    >
                      ጾታ ይምረጡ
                    </option>
                    {GENDERS.map((g) => (
                      <option
                        key={g.value}
                        value={g.value}
                        className="text-white bg-gray-900"
                      >
                        {g.label} / {g.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#ef4444] text-xs text-center bg-[#ef4444]/10 backdrop-blur-md px-3 py-2 rounded-lg border border-[#ef4444]/25"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={step === "submitting"}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full py-3.5 rounded-lg font-bold text-sm
                    bg-gradient-to-r ${RED_GRADIENT}
                    text-white
                    shadow-lg shadow-[#dc2626]/30
                    hover:shadow-xl hover:shadow-[#dc2626]/50
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition-all duration-300
                    flex items-center justify-center gap-2
                  `}
                >
                  {step === "submitting" ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      በመመዝገብ ላይ...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      ይመዝገቡ / Submit
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── SUCCESS: Thank You + Countdown ──────────── */}
          {step === "success" && (
            <motion.div
              key="success"
              variants={stagger}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center"
            >
              {/* Animated decorative rings */}
              <motion.div
                variants={fadeSlideUp}
                className="relative flex justify-center mb-6"
              >
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#ef4444]/10 blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Middle ring */}
                <motion.div
                  className="absolute w-24 h-24 rounded-full border border-[#ef4444]/20"
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                {/* Inner ring */}
                <motion.div
                  className="absolute w-20 h-20 rounded-full border border-dashed border-[#ef4444]/15"
                  animate={{ scale: [1, 1.1, 1], rotate: [360, 180, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                {/* Success Icon */}
                <motion.div
                  className="relative w-20 h-20 rounded-full bg-black/60 backdrop-blur-xl border-2 border-[#ef4444]/40 flex items-center justify-center shadow-xl shadow-[#ef4444]/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.1,
                  }}
                >
                  <motion.svg
                    className="w-10 h-10 text-[#ef4444]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </motion.svg>
                </motion.div>
              </motion.div>

              {/* Success Card */}
              <motion.div
                variants={fadeSlideUp}
                className="relative bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-[#ef4444]/20 p-6 shadow-lg shadow-[#ef4444]/10 overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#ef4444]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#dc2626]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-xl font-bold text-white mb-1">
                      ተመዝግበዋል! ✅
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      ኮርሱ ሲጀመር እናሳውቅዎታለን።
                    </p>
                  </motion.div>

                  <motion.div
                    className="w-12 h-0.5 bg-gradient-to-r from-[#ef4444]/40 to-transparent mx-auto"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <p className="text-xs text-[#ef4444]/60 font-medium mb-2 tracking-wide">
                      እስከሚጀመር ያለው ጊዜ
                    </p>
                    <ComingSoonCountdown
                      targetDate={launchDate}
                      variant="small"
                    />
                  </motion.div>

                  <motion.p
                    className="text-xs text-white/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    እስከዚያ ድረስ ይጠብቁን! 🚀
                  </motion.p>
                </div>
              </motion.div>

              {/* Close button inside success */}
              <motion.button
                onClick={closeOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-4 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
              >
                ዝጋ / Close
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </ComingSoonOverlay>
    </>
  );
}
