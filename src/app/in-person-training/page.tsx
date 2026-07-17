"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { authFetchJson } from "@/lib/utils/auth-fetch";

interface CourseOption {
  id: string;
  title: string;
}

interface TrainingStats {
  capacity: number;
  registeredCount: number;
  remainingSpots: number;
  paymentInstructions: string;
}

const TRAINING_TITLE = "TikTok For Personal Training Masterclase";
const COUNTDOWN_DAYS = 15;
const STEP_TITLES = [
  {
    id: 1,
    title: "Your details",
    caption: "Start with your contact information",
  },
  { id: 2, title: "Payment method", caption: "Choose how you will pay" },
  { id: 3, title: "Receipt upload", caption: "Send your proof of payment" },
];

export default function InPersonTrainingPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(
    null,
  );
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [now, setNow] = useState(new Date());
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    paymentMethod: "telebirr",
    paymentReceiptBase64: "",
    paymentReceiptFilename: "",
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch("/api/courses?limit=100");
        const payload = await response.json();
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];
        const normalizedCourses = (list as CourseOption[]) || [];
        setCourses(normalizedCourses);
        if (normalizedCourses[0]?.id) {
          setSelectedCourseId(normalizedCourses[0].id);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await authFetchJson(
          `/api/in-person-training/${selectedCourseId}`,
          {
            method: "GET",
          },
        );
        if (response.response.ok) {
          setTrainingStats(response.data?.data || null);
        }
      } catch (err) {
        console.error("Failed to load training stats", err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [selectedCourseId]);

  const countdown = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + COUNTDOWN_DAYS);
    const diff = startDate.getTime() - now.getTime();
    const safeDiff = Math.max(0, diff);
    const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (safeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((safeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((safeDiff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  }, [now]);

  const progressPercent = useMemo(() => {
    if (step >= 3) return 100;
    return step === 1 ? 33 : 66;
  }, [step]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentMethodSelect = (value: string) => {
    setFormData((prev) => ({ ...prev, paymentMethod: value }));
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const acceptedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (file.type && !acceptedTypes.includes(file.type)) {
      setError(
        "Please upload a receipt image in PNG, JPG, JPEG, or WEBP format.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setFormData((prev) => ({
        ...prev,
        paymentReceiptBase64: base64,
        paymentReceiptFilename: file.name,
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const openModal = () => {
    setMessage("");
    setError("");
    setStep(1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStep(1);
  };

  const handleNextStep = () => {
    if (!formData.fullName.trim() || !formData.phoneNumber.trim()) {
      setError("Please enter your full name and phone number first.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    if (!formData.paymentReceiptBase64 || !formData.paymentReceiptFilename) {
      setError("Please upload your payment receipt before submitting.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await authFetchJson("/api/in-person-training", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          courseId: selectedCourseId,
        }),
      });

      if (response.response.ok) {
        setMessage(
          response.data?.data?.message ||
            "Your receipt was submitted successfully. Please wait for admin confirmation and you will receive your coupon code once approved.",
        );
        setFormData({
          fullName: "",
          phoneNumber: "",
          email: "",
          paymentMethod: "telebirr",
          paymentReceiptBase64: "",
          paymentReceiptFilename: "",
        });
        setStep(4);
        if (selectedCourseId) {
          const statsResponse = await authFetchJson(
            `/api/in-person-training/${selectedCourseId}`,
            {
              method: "GET",
            },
          );
          if (statsResponse.response.ok) {
            setTrainingStats(statsResponse.data?.data || null);
          }
        }
      } else {
        setError(response.data?.error || "Unable to save registration");
      }
    } catch (err) {
      console.error("Failed to submit standalone in-person training form", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(195,115,15,0.18),_transparent_40%),linear-gradient(135deg,_#080403_0%,_#0f0a08_45%,_#0f0b09_100%)] px-3 py-6 sm:px-4 sm:py-10 lg:px-6 lg:py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <div className="overflow-hidden rounded-[24px] border border-[#5c0000]/20 bg-[#0f0b09]/95 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.28)] sm:rounded-[32px] sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-[#ef4444]/30 bg-white/10 px-3 py-1 text-xs font-medium text-[#f7d7da]">
                Welcome to in-person training
              </span>
              <h1 className="mt-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
                {TRAINING_TITLE}
              </h1>
              <p className="mt-4 text-sm text-[#f7d7da]/80 sm:text-base">
                Reserve your place for this premium classroom experience, pay
                through Telebirr or CBE Birr, upload your receipt, and await
                admin approval for your coupon code.
              </p>
            </div>
            <button
              onClick={openModal}
              className="w-full rounded-lg bg-gradient-to-r from-[#5c0000] to-[#5c0000] px-5 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 sm:w-auto"
            >
              Reserve your seat
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <div className="rounded-[20px] border border-[#5c0000]/20 bg-[#140707]/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#ef4444]/40">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f7d7da]/60">
                Today
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {now.toLocaleDateString("en", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="mt-1 text-sm text-[#f7d7da]/70">
                {now.toLocaleTimeString("en", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
            <div className="rounded-[20px] border border-[#5c0000]/20 bg-[#140707]/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#ef4444]/40">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f7d7da]/60">
                Starts in
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-lg font-semibold text-[#ef4444]">
                <span className="rounded-lg bg-[#220a0a] px-3 py-2">
                  {countdown.days}d
                </span>
                <span className="rounded-lg bg-[#220a0a] px-3 py-2">
                  {countdown.hours}h
                </span>
                <span className="rounded-lg bg-[#220a0a] px-3 py-2">
                  {countdown.minutes}m
                </span>
                <span className="rounded-lg bg-[#220a0a] px-3 py-2">
                  {countdown.seconds}s
                </span>
              </div>
              <p className="mt-2 text-sm text-[#f7d7da]/70">
                A {COUNTDOWN_DAYS}-day countdown to the training launch.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#5c0000]/20 bg-[#140707]/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[#ef4444]/40">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f7d7da]/60">
                Seats remaining
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#ef4444]">
                {loadingStats ? "..." : (trainingStats?.remainingSpots ?? "—")}
              </p>
              <p className="mt-2 text-sm text-[#f7d7da]/70">
                {trainingStats
                  ? `${trainingStats.registeredCount} already registered`
                  : "Loading availability..."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#5c0000]/20 bg-[#0f0b09]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:rounded-[28px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#ef4444]">
                Registration details
              </h2>
              <p className="mt-1 text-sm text-[#f7d7da]/70">
                The form opens in a popup so the experience stays focused and
                clean.
              </p>
            </div>
            <div className="rounded-full border border-[#5c0000]/20 bg-[#140707] px-4 py-2 text-sm text-[#f7d7da]/70">
              {loadingCourses
                ? "Preparing training"
                : `${courses.length} available training option${courses.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#5c0000]/20 bg-[#0f0b09] shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[28px]">
            <div className="border-b border-[#5c0000]/20 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#f7d7da]/60">
                    In-person training
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[#ef4444]">
                    {TRAINING_TITLE}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-[#5c0000]/20 px-3 py-1 text-sm text-[#f7d7da]/70 transition-colors hover:text-[#ef4444]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[#f7d7da]/60">
                  <span>Registration progress</span>
                  <span>{step}/3</span>
                </div>
                <div className="h-2 rounded-full bg-[#220a0a]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#5c0000] to-[#5c0000] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex flex-col gap-1 rounded-[14px] border border-[#5c0000]/20 bg-[#140707]/70 p-3 text-sm text-[#f7d7da]/70 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-[#ef4444]">
                    {STEP_TITLES[step - 1]?.title}
                  </span>
                  <span>{STEP_TITLES[step - 1]?.caption}</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 px-4 py-4 sm:px-6 sm:py-6"
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-[18px] border border-[#5c0000]/20 bg-[#140707]/70 p-4">
                      <p className="text-sm font-semibold text-[#ef4444]">
                        Step 1: Your details
                      </p>
                      <p className="mt-1 text-sm text-[#f7d7da]/70">
                        Please enter your name and phone number so we can
                        register you for the training.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-[#f7d7da]/80">
                        <span className="mb-1 block">Full name</span>
                        <input
                          required
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-[#5c0000]/20 bg-[#140707] px-3 py-2 text-sm text-white outline-none"
                        />
                      </label>

                      <label className="text-sm text-[#f7d7da]/80">
                        <span className="mb-1 block">Phone number</span>
                        <input
                          required
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-[#5c0000]/20 bg-[#140707] px-3 py-2 text-sm text-white outline-none"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full rounded-lg bg-gradient-to-r from-[#5c0000] to-[#5c0000] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-[18px] border border-[#5c0000]/20 bg-[#140707]/70 p-4">
                      <p className="text-sm font-semibold text-[#ef4444]">
                        Step 2: Choose payment method
                      </p>
                      <p className="mt-1 text-sm text-[#f7d7da]/70">
                        Select how you want to pay for the in-person training.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-[#ef4444]">
                        Payment method
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            value: "telebirr",
                            label: "Telebirr",
                            desc: "Fast mobile payment",
                          },
                          {
                            value: "cb_birr",
                            label: "CBE Birr",
                            desc: "Bank transfer style",
                          },
                        ].map((option) => {
                          const isActive =
                            formData.paymentMethod === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handlePaymentMethodSelect(option.value)
                              }
                              className={`rounded-[16px] border p-3 text-left transition-all ${
                                isActive
                                  ? "border-[#ef4444] bg-[#220a0a] shadow-[0_0_0_1px_rgba(245,201,107,0.2)]"
                                  : "border-[#5c0000]/20 bg-[#140707] hover:border-[#ef4444]/40"
                              }`}
                            >
                              <p className="text-sm font-semibold text-white">
                                {option.label}
                              </p>
                              <p className="mt-1 text-xs text-[#f7d7da]/70">
                                {option.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[#ef4444]/20 bg-[#1c0909] p-4 text-sm text-[#f7d7da]/80">
                      <p className="font-semibold text-[#ef4444]">
                        Payment information
                      </p>
                      <p className="mt-2">
                        Amount to pay:{" "}
                        <span className="font-semibold text-white">
                          1,500 ETB
                        </span>
                      </p>
                      <p className="mt-1">
                        {formData.paymentMethod === "cb_birr"
                          ? "Pay to CBE Birr account: 1000123456789"
                          : "Pay to Telebirr account: 0912345678"}
                      </p>
                      <p className="mt-1">
                        Please keep the receipt safe for upload.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-lg border border-[#5c0000]/20 px-4 py-2 text-sm text-[#f7d7da]/70 transition-colors hover:border-[#ef4444]/40 hover:text-[#ef4444]"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="w-full rounded-lg bg-gradient-to-r from-[#5c0000] to-[#5c0000] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
                      >
                        Continue to receipt
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-[18px] border border-[#5c0000]/20 bg-[#140707]/70 p-4">
                      <p className="text-sm font-semibold text-[#ef4444]">
                        Step 3: Upload receipt
                      </p>
                      <p className="mt-1 text-sm text-[#f7d7da]/70">
                        Upload a clear image of your payment receipt and preview
                        it before submitting.
                      </p>
                    </div>
                    <label className="block text-sm text-[#f7d7da]/80">
                      <span className="mb-1 block">Upload payment receipt</span>
                      <div className="rounded-[20px] border border-dashed border-[#5c0000]/30 bg-[radial-gradient(circle_at_top,_rgba(195,115,15,0.16),_transparent_35%),linear-gradient(135deg,_#140707_0%,_#0f0b09_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <input
                          required
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleReceiptChange}
                          className="block w-full cursor-pointer rounded-lg border border-[#5c0000]/20 bg-[#140707] px-3 py-3 text-sm text-[#f7d7da]/80 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#5c0000] file:to-[#5c0000] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                        />
                        <p className="mt-3 text-xs text-[#f7d7da]/60">
                          Supported formats: PNG, JPG, JPEG, WEBP. Keep the
                          receipt clear and legible.
                        </p>
                      </div>
                    </label>

                    {formData.paymentReceiptFilename ? (
                      <div className="overflow-hidden rounded-[20px] border border-[#5c0000]/20 bg-[#140707]/80 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#ef4444]">
                            Receipt preview
                          </p>
                          <span className="rounded-full bg-[#220a0a] px-3 py-1 text-xs text-[#f7d7da]/70">
                            {formData.paymentReceiptFilename}
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-[16px] border border-[#5c0000]/20 bg-[#0b0606] p-2">
                          <img
                            src={`data:image/png;base64,${formData.paymentReceiptBase64}`}
                            alt="Receipt preview"
                            className="max-h-72 w-full rounded-[12px] object-contain"
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-lg border border-[#5c0000]/20 px-4 py-2 text-sm text-[#f7d7da]/70 transition-colors hover:border-[#ef4444]/40 hover:text-[#ef4444]"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-lg bg-gradient-to-r from-[#5c0000] to-[#5c0000] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
                      >
                        {submitting ? "Submitting..." : "Submit receipt"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {step === 4 && (
                <motion.div
                  key="success-state"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="overflow-hidden rounded-[22px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.18),_transparent_40%),linear-gradient(135deg,_rgba(22,101,52,0.35),_rgba(5,20,10,0.95))] p-4 shadow-[0_15px_40px_rgba(16,185,129,0.12)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/20 text-2xl text-emerald-200">
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-200">
                          Receipt submitted successfully
                        </p>
                        <p className="mt-1 text-sm text-emerald-50/90">
                          Your registration request is now in review. We will
                          confirm your payment and send your coupon as soon as
                          it is approved.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#5c0000]/20 bg-[#140707]/70 p-4 text-sm text-[#f7d7da]/80">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">
                        Amount paid
                      </span>
                      <span className="rounded-full bg-[#220a0a] px-3 py-1 text-[#ef4444]">
                        1,500 ETB
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 rounded-[14px] border border-[#5c0000]/15 bg-[#0f0b09]/70 p-3">
                      <p>
                        Payment method:{" "}
                        <span className="font-semibold text-white">
                          {formData.paymentMethod === "cb_birr"
                            ? "CBE Birr"
                            : "Telebirr"}
                        </span>
                      </p>
                      <p>
                        Receipt file:{" "}
                        <span className="font-semibold text-white">
                          {formData.paymentReceiptFilename ||
                            "Uploaded successfully"}
                        </span>
                      </p>
                      <p>
                        Next step:{" "}
                        <span className="font-semibold text-white">
                          Admin approval
                        </span>
                      </p>
                    </div>
                    <p className="mt-3 text-[#f7d7da]/70">
                      Once approved, the coupon code will appear in your
                      dashboard and you can continue with the training.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-full rounded-lg bg-gradient-to-r from-[#5c0000] to-[#5c0000] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              )}

              {message && step !== 4 && (
                <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {message}
                </p>
              )}

              {error && <p className="text-sm text-red-300">{error}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
