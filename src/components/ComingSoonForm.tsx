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
  country: string;
}

// ─── Animation Variants ──────────────────────────────────

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

// ─── Countries ──────────────────────────────────────────

const COUNTRIES = [
  { value: "ethiopia", label: "ኢትዮጵያ", labelEn: "Ethiopia" },
  { value: "united_states", label: "ዩናይትድ ስቴትስ", labelEn: "United States" },
  { value: "canada", label: "ካናዳ", labelEn: "Canada" },
  { value: "united_kingdom", label: "ዩናይትድ ኪንግደም", labelEn: "United Kingdom" },
  { value: "germany", label: "ጀርመን", labelEn: "Germany" },
  { value: "france", label: "ፈረንሳይ", labelEn: "France" },
  { value: "italy", label: "ጣሊያን", labelEn: "Italy" },
  { value: "sweden", label: "ስዊድን", labelEn: "Sweden" },
  { value: "norway", label: "ኖርዌይ", labelEn: "Norway" },
  { value: "denmark", label: "ዴንማርክ", labelEn: "Denmark" },
  { value: "finland", label: "ፊንላንድ", labelEn: "Finland" },
  { value: "netherlands", label: "ኔዘርላንድስ", labelEn: "Netherlands" },
  { value: "belgium", label: "ቤልጂየም", labelEn: "Belgium" },
  { value: "switzerland", label: "ስዊዘርላንድ", labelEn: "Switzerland" },
  { value: "austria", label: "ኦስትሪያ", labelEn: "Austria" },
  { value: "spain", label: "ስፔን", labelEn: "Spain" },
  { value: "portugal", label: "ፖርቱጋል", labelEn: "Portugal" },
  { value: "ireland", label: "አየርላንድ", labelEn: "Ireland" },
  { value: "australia", label: "አውስትራሊያ", labelEn: "Australia" },
  { value: "new_zealand", label: "ኒው ዚላንድ", labelEn: "New Zealand" },
  { value: "japan", label: "ጃፓን", labelEn: "Japan" },
  { value: "south_korea", label: "ደቡብ ኮሪያ", labelEn: "South Korea" },
  { value: "china", label: "ቻይና", labelEn: "China" },
  { value: "india", label: "ህንድ", labelEn: "India" },
  { value: "uae", label: "ተባበሩት ዓረብ ኤምሬትስ", labelEn: "United Arab Emirates" },
  { value: "saudi_arabia", label: "ሳውዲ አረቢያ", labelEn: "Saudi Arabia" },
  { value: "qatar", label: "ታተር", labelEn: "Qatar" },
  { value: "kuwait", label: "ኩዌት", labelEn: "Kuwait" },
  { value: "bahrain", label: "ባህሬን", labelEn: "Bahrain" },
  { value: "oman", label: "ኦማን", labelEn: "Oman" },
  { value: "egypt", label: "ግብፅ", labelEn: "Egypt" },
  { value: "sudan", label: "ሱዳን", labelEn: "Sudan" },
  { value: "kenya", label: "ኬንያ", labelEn: "Kenya" },
  { value: "uganda", label: "ዩጋንዳ", labelEn: "Uganda" },
  { value: "tanzania", label: "ታንዛኒያ", labelEn: "Tanzania" },
  { value: "south_africa", label: "ደቡብ አፍሪካ", labelEn: "South Africa" },
  { value: "nigeria", label: "ናይጄሪያ", labelEn: "Nigeria" },
  { value: "ghana", label: "ጋና", labelEn: "Ghana" },
  { value: "djibouti", label: "ጅቡቲ", labelEn: "Djibouti" },
  { value: "somalia", label: "ሶማሊያ", labelEn: "Somalia" },
  { value: "eritrea", label: "ኤርትራ", labelEn: "Eritrea" },
  { value: "south_sudan", label: "ደቡብ ሱዳን", labelEn: "South Sudan" },
  { value: "israel", label: "እስራኤል", labelEn: "Israel" },
  { value: "turkey", label: "ቱርክ", labelEn: "Turkey" },
  { value: "russia", label: "ሩሲያ", labelEn: "Russia" },
  { value: "ukraine", label: "ዩክሬን", labelEn: "Ukraine" },
  { value: "poland", label: "ፖላንድ", labelEn: "Poland" },
  { value: "czech_republic", label: "ቼክ ሪፑብሊክ", labelEn: "Czech Republic" },
  { value: "hungary", label: "ሀንጋሪ", labelEn: "Hungary" },
  { value: "romania", label: "ሮማኒያ", labelEn: "Romania" },
  { value: "greece", label: "ግሪክ", labelEn: "Greece" },
  { value: "brazil", label: "ብራዚል", labelEn: "Brazil" },
  { value: "mexico", label: "ሜክሲኮ", labelEn: "Mexico" },
  { value: "argentina", label: "አርጀንቲና", labelEn: "Argentina" },
  { value: "colombia", label: "ኮሎምቢያ", labelEn: "Colombia" },
  { value: "thailand", label: "ታይላንድ", labelEn: "Thailand" },
  { value: "malaysia", label: "ማሌዢያ", labelEn: "Malaysia" },
  { value: "singapore", label: "ሲንጋፖር", labelEn: "Singapore" },
  { value: "indonesia", label: "ኢንዶኔዢያ", labelEn: "Indonesia" },
  { value: "philippines", label: "ፊሊፒንስ", labelEn: "Philippines" },
  { value: "vietnam", label: "ቬትናም", labelEn: "Vietnam" },
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
    country: "",
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
    setForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      gender: "",
      country: "",
    });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setStep("idle");
    setLocationType(null);
    setError("");
    setForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      gender: "",
      country: "",
    });
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
    if (locationType === "diaspora" && !form.country) {
      setError("እባክዎ ሀገር ይምረጡ");
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
          country: form.country || undefined,
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
        <button
          onClick={openOverlay}
          className={`
            w-full rounded-xl
            bg-gradient-to-r ${RED_GRADIENT}
            text-white font-bold text-base sm:text-lg
            px-8 py-4
            shadow-lg shadow-[#dc2626]/30
            hover:shadow-xl hover:shadow-[#dc2626]/50
            active:scale-[0.98]
            transition-all duration-300
          `}
        >
          <span className="flex items-center justify-center gap-3">
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
        </button>
      </div>
    );
  }

  // ── Render: Inline success card (registered, overlay closed) ──

  if (!overlayOpen && hasSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Main card */}
          <div className="relative bg-gradient-to-br from-[#7f1d1d]/25 via-[#dc2626]/12 to-[#ef4444]/8 backdrop-blur-xl rounded-2xl border border-[#ef4444]/25 p-6 shadow-xl shadow-[#dc2626]/15 overflow-hidden">
            <div className="relative z-10 text-center space-y-5">
              {/* Success Icon */}
              <div className="relative flex justify-center mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7f1d1d]/40 to-[#dc2626]/20 border-2 border-[#ef4444]/40 flex items-center justify-center shadow-lg shadow-[#ef4444]/20">
                  <svg
                    className="w-8 h-8 text-[#ef4444]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Thank you */}
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  <span className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] bg-clip-text text-transparent">
                    ተመዝግበዋል!
                  </span>{" "}
                  ✅
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  ኮርሱ ሲጀመር እናሳውቅዎታለን።
                </p>
              </div>

              {/* Countdown */}
              <div>
                <p className="text-xs text-[#ef4444]/70 font-bold mb-3 tracking-[0.15em] uppercase">
                  እስከሚጀመር ያለው ጊዜ
                </p>
                <ComingSoonCountdown targetDate={launchDate} variant="small" />
              </div>

              <p className="text-xs text-white/40">እስከዚያ ድረስ ይጠብቁን! 🚀</p>
            </div>
          </div>
        </div>
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
            <div key="location" className="space-y-5">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7f1d1d]/40 to-[#dc2626]/20 border border-[#ef4444]/30 mb-2">
                  <span className="text-2xl">🚀</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  ቀደም ብለው ይመዝገቡ
                </h2>
                <p className="text-sm text-white/50 max-w-xs mx-auto">
                  አዲሱን Adony TikTok Academy በቅርቡ ይጀምራል። የት ይኖራሉ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Local */}
                <button
                  onClick={() => handleLocationSelect("local")}
                  className={`
                    flex flex-col items-center gap-3
                    p-6 sm:p-7 rounded-xl
                    bg-white/[0.06] backdrop-blur-md
                    border border-white/10
                    hover:border-[#ef4444]/60
                    hover:bg-white/[0.1]
                    active:scale-[0.97]
                    transition-all duration-300
                    shadow-lg
                  `}
                >
                  <span className="text-4xl">📍</span>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">Local</p>
                    <p className="text-[#ef4444]/60 text-xs font-medium">
                      ኢትዮጵያ
                    </p>
                  </div>
                </button>

                {/* Diaspora */}
                <button
                  onClick={() => handleLocationSelect("diaspora")}
                  className={`
                    flex flex-col items-center gap-3
                    p-6 sm:p-7 rounded-xl
                    bg-white/[0.06] backdrop-blur-md
                    border border-white/10
                    hover:border-[#ef4444]/60
                    hover:bg-white/[0.1]
                    active:scale-[0.97]
                    transition-all duration-300
                    shadow-lg
                  `}
                >
                  <span className="text-4xl">🌍</span>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">Diaspora</p>
                    <p className="text-[#ef4444]/60 text-xs font-medium">
                      ውጭ ሀገር
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── FORM: Dynamic based on location ─────────── */}
          {["form", "submitting"].includes(step) && (
            <div key="form">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors active:scale-95"
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
                </button>
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
                  <>
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

                    {/* Country — only for diaspora */}
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">
                        ሀገር / Country <span className={RED_TEXT}>*</span>
                      </label>
                      <select
                        name="country"
                        value={form.country}
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
                          ሀገር ይምረጡ / Select Country
                        </option>
                        {COUNTRIES.map((c) => (
                          <option
                            key={c.value}
                            value={c.value}
                            className="text-white bg-gray-900"
                          >
                            {c.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
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
                  <p className="text-[#ef4444] text-xs text-center bg-[#ef4444]/10 backdrop-blur-md px-3 py-2 rounded-lg border border-[#ef4444]/25">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={step === "submitting"}
                  className={`
                    w-full py-3.5 rounded-lg font-bold text-sm
                    bg-gradient-to-r ${RED_GRADIENT}
                    text-white
                    shadow-lg shadow-[#dc2626]/30
                    hover:shadow-xl hover:shadow-[#dc2626]/50
                    active:scale-[0.98]
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
                </button>
              </form>
            </div>
          )}

          {/* ── SUCCESS: Thank You + Countdown ──────────── */}
          {step === "success" && (
            <div key="success" className="text-center">
              {/* Success Icon */}
              <div className="relative flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-xl border-2 border-[#ef4444]/40 flex items-center justify-center shadow-xl shadow-[#ef4444]/20">
                  <svg
                    className="w-10 h-10 text-[#ef4444]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Success Card */}
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-[#ef4444]/20 p-6 shadow-lg shadow-[#ef4444]/10">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      ተመዝግበዋል! ✅
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      ኮርሱ ሲጀመር እናሳውቅዎታለን።
                    </p>
                  </div>

                  <p className="text-xs text-[#ef4444]/60 font-medium mb-2 tracking-wide">
                    እስከሚጀመር ያለው ጊዜ
                  </p>
                  <ComingSoonCountdown
                    targetDate={launchDate}
                    variant="small"
                  />

                  <p className="text-xs text-white/40">እስከዚያ ድረስ ይጠብቁን! 🚀</p>
                </div>
              </div>

              {/* Close button inside success */}
              <button
                onClick={closeOverlay}
                className="mt-4 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
              >
                ዝጋ / Close
              </button>
            </div>
          )}
        </AnimatePresence>
      </ComingSoonOverlay>
    </>
  );
}
