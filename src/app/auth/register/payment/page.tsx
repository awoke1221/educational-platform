"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch, cachedAuthFetchJson } from "@/lib/utils/cache";
import { SegmentedToggle } from "@/components/toggle";
import type { SegmentedOption } from "@/components/toggle";

function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUserId = searchParams.get("userId");
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const courseId = searchParams.get("courseId");

  const [method, setMethod] = useState<"local" | "diaspora">("local");
  const [channel, setChannel] = useState<string>("telebirr");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(
    queryUserId,
  );
  const [loadingUser, setLoadingUser] = useState(!queryUserId);
  const [token, setToken] = useState<string>("");
  const [course, setCourse] = useState<{
    id: string;
    title: string;
    price: number;
    currency?: string;
  } | null>(null);
  const [profile, setProfile] = useState<{
    id: string;
    fullName: string;
    email: string;
    paymentStatus?: string;
    pendingReceiptUrl?: string | null;
  } | null>(null);
  const [courseStatus, setCourseStatus] = useState<
    "active" | "processing" | "none"
  >("none");
  const [fullName, setFullName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [step, setStep] = useState<"details" | "receipt">("details");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
  }, []);

  useEffect(() => {
    if (!token && !queryUserId) {
      setLoadingUser(false);
      return;
    }

    const loadData = async () => {
      setLoadingUser(true);

      try {
        // Parallel fetch: profile, course, and enrollments all at once
        const promises: Promise<void>[] = [];

        if (token) {
          promises.push(
            (async () => {
              const profileResult = await authFetchJson("/api/user/profile", {
                method: "GET",
              });
              if (profileResult.response.ok) {
                const profileData = profileResult.data.data || null;
                setProfile(profileData);
                setResolvedUserId((prev) => prev || profileData?.id || null);
                setFullName(profileData?.fullName || "");
                setPhoneNumber(profileData?.phoneNumber || "");
              }
            })(),
          );
        }

        if (courseId) {
          promises.push(
            (async () => {
              const courseData = await cachedFetch(
                `/api/courses/${courseId}`,
                undefined,
                15_000,
              );
              if (courseData?.data) {
                setCourse(courseData.data);
              }
            })(),
          );
        }

        if (token && courseId) {
          promises.push(
            (async () => {
              const enrResult = await cachedAuthFetchJson(
                `/api/enrollments`,
                { method: "GET" },
                15_000,
              );
              const items = enrResult.data?.data || enrResult.data || [];
              const active = items.some(
                (e: any) =>
                  (e.courseId || e.course?.id) === courseId &&
                  e.status === "active",
              );
              const processing = items.some(
                (e: any) =>
                  (e.courseId || e.course?.id) === courseId &&
                  e.status === "processing",
              );
              setCourseStatus(
                active ? "active" : processing ? "processing" : "none",
              );
            })(),
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.warn("Unable to resolve payment state", err);
      } finally {
        setLoadingUser(false);
      }
    };

    loadData();
  }, [token, queryUserId, courseId]);

  if (loadingUser) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-700">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
            <p className="text-slate-300 text-lg">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resolvedUserId) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 border border-red-700 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0-6a4 4 0 00-4 4v4a4 4 0 004 4h4a4 4 0 004-4v-4a4 4 0 00-4-4m0 0V7a4 4 0 00-8 0v4m0 0a4 4 0 004 4h4a4 4 0 004-4"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Authentication Required
            </h2>
            <p className="text-slate-300 mb-6">
              Please log in to your account to access the payment page.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="px-6 py-3 bg-gradient-to-r from-accent to-secondary text-slate-900 rounded-lg font-semibold hover:shadow-lg hover:shadow-accent/30 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const courseLabel = course
    ? `${course.title} — ${(course.currency || "ETB") + " " + course.price}`
    : "Selected course";
  const isPending = courseStatus === "processing";
  const isActive = courseStatus === "active";

  const statusLabel =
    courseStatus === "active"
      ? "Active access"
      : courseStatus === "processing"
        ? "Pending approval"
        : "Receipt required";

  const statusColor =
    courseStatus === "active"
      ? "bg-emerald-100 text-emerald-800"
      : courseStatus === "processing"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-800";

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (!f.type.startsWith("image/")) return setError("Only images allowed");
    if (f.size > 5 * 1024 * 1024) return setError("Max 5MB file size");
    setFile(f);
  };

  const proceedToReceipt = () => {
    setError(null);
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setStep("receipt");
  };

  const uploadReceipt = async () => {
    if (!file) return setError("Please select a receipt image");
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(
          `/api/registrations/${resolvedUserId}/receipt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod: method,
              paymentChannel: channel,
              filename: file.name,
              fileBase64: base64,
              courseId,
              fullName: fullName.trim(),
              phoneNumber: phoneNumber.trim(),
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed");
        } else {
          setMessage(
            `Thank you for your payment. We have received your receipt for ${course?.title || "this course"}. Once verified, your course access will become active.`,
          );
          setSuccess(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-secondary opacity-10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-700 relative z-10">
        {/* Header with icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-secondary rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent mb-2">
            Complete Payment
          </h1>
          <p className="text-slate-300">
            Secure payment to unlock your learning journey
          </p>
        </div>

        {/* Course info card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 p-6 mb-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">
                Course Details
              </p>
              <p className="font-bold text-white text-lg">{courseLabel}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-xs font-bold ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {courseStatus === "active"
              ? "🎉 You already have access to this course. Continue learning from your dashboard."
              : courseStatus === "processing"
                ? "⏳ Your receipt is under review. Admin approval is required before course access becomes active."
                : queryUserId
                  ? "📋 Complete payment for your new registration by uploading a receipt."
                  : "🔒 Select a payment method, upload your receipt, and our admin team will review it."}
          </p>
          {(courseStatus === "active" || courseStatus === "processing") && (
            <div className="mt-4 rounded-lg bg-slate-900 p-4 border border-slate-600">
              <p className="font-semibold text-accent mb-2">
                Current course status
              </p>
              <p className="text-slate-300 text-sm">
                {courseStatus === "active"
                  ? "✅ You have active access to this course. Open the course page to continue learning immediately."
                  : "⏱️ Your receipt submission is pending review. Admin approval is required before course access becomes active."}
              </p>
            </div>
          )}
        </div>

        {success ? (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-700 p-8 text-center backdrop-blur">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg">
              <svg
                className="w-10 h-10"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-emerald-100 mb-2">
              🎉 Payment Submitted!
            </h2>
            <p className="text-sm text-emerald-200 max-w-xl mx-auto leading-relaxed">
              Thank you for your payment for{" "}
              <strong>{course?.title || "the course"}</strong>.
              <br />
              We have received your receipt and our team is reviewing it. Your
              course access will become active once verified.
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-3 border-2 border-emerald-500 text-emerald-300 rounded-full font-semibold hover:bg-emerald-500/10 transition-all duration-300"
              >
                Submit Another Receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <SegmentedToggle<"local" | "diaspora">
              variant="cards"
              name="Payment method"
              value={method}
              onChange={(v) => {
                setMethod(v);
                setChannel(v === "local" ? "telebirr" : "paypal");
              }}
              options={
                [
                  {
                    value: "local",
                    label: "Local payment",
                    icon: "T",
                    description:
                      "Telebirr / bank transfer — Pay locally, then upload the receipt for admin verification.",
                  },
                  {
                    value: "diaspora",
                    label: "Diaspora payment",
                    icon: "D",
                    description:
                      "PayPal / international transfer — Send the international payment and upload the receipt.",
                  },
                ] as SegmentedOption<"local" | "diaspora">[]
              }
            />

            <div className="p-6 border border-slate-600 rounded-2xl bg-slate-800/50 backdrop-blur">
              {method === "local" ? (
                <div>
                  <p className="font-bold text-accent mb-2 flex items-center gap-2">
                    <span className="text-2xl">💰</span> Pay with Telebirr
                  </p>
                  <p className="text-slate-300 text-sm mt-2">
                    Scan the Telebirr QR or send to phone number:{" "}
                    <span className="font-mono font-bold text-accent">
                      +2519XXXXXXX
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-slate-200">
                    <span className="font-semibold text-accent">Amount:</span>{" "}
                    <span className="text-lg font-bold">
                      {(course?.currency || "ETB") + " " + course?.price}
                    </span>
                  </p>
                  <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600 inline-block">
                    <img
                      src="/telebirr qrcode.jpeg"
                      alt="telebirr-qr"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-accent mb-2 flex items-center gap-2">
                    <span className="text-2xl">🌍</span> Pay with PayPal
                  </p>
                  <p className="text-slate-300 text-sm mt-2">
                    Send payment to:{" "}
                    <span className="font-mono font-bold text-accent">
                      payments@example.com
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-slate-200">
                    <span className="font-semibold text-accent">Amount:</span>{" "}
                    <span className="text-lg font-bold">
                      {(course?.currency || "ETB") + " " + course?.price}
                    </span>
                  </p>
                  <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600 inline-block">
                    <img
                      src="/paypal qrcode.png"
                      alt="paypal-qr"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details Form */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-600">
              <p className="text-slate-300 text-sm mb-4 flex items-center gap-2">
                <span className="text-lg">📋</span> Step 1: Confirm your contact
                details for verification
              </p>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-bold text-accent mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none transition-colors text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-accent mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none transition-colors text-sm"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={proceedToReceipt}
                disabled={loading || courseStatus !== "none"}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-secondary text-slate-900 rounded-lg hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                Continue to Receipt Upload
              </button>
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-6 py-3 border-2 border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all duration-300 font-semibold"
              >
                Cancel
              </button>
            </div>

            {step === "receipt" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-600">
                  <p className="font-bold text-accent text-sm flex items-center gap-2 mb-2">
                    <span className="text-lg">📸</span> Step 2: Upload your
                    receipt
                  </p>
                  <p className="text-slate-300 text-sm mb-4">
                    Choose the receipt image you received from the payment
                    provider.
                  </p>

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      className="block px-4 py-8 border-2 border-dashed border-slate-500 rounded-lg text-center cursor-pointer hover:border-accent transition-colors group"
                    >
                      <svg
                        className="mx-auto h-12 w-12 text-slate-400 group-hover:text-accent transition-colors mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="text-slate-300 font-semibold">
                        Click to upload or drag image here
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </label>
                  </div>

                  {file && (
                    <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-emerald-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-emerald-300 text-sm font-semibold truncate">
                          {file.name}
                        </p>
                        <p className="text-emerald-400/70 text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{message}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={uploadReceipt}
                    disabled={loading || courseStatus !== "none"}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-secondary text-slate-900 rounded-lg hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    {loading ? "📤 Uploading..." : "🚀 Send Payment Receipt"}
                  </button>
                  <button
                    onClick={() => setStep("details")}
                    className="px-6 py-3 border-2 border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all duration-300 font-semibold"
                  >
                    Back to Details
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
          <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-700">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
              <p className="text-slate-300 text-lg mt-4">
                Loading payment page...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PaymentForm />
    </Suspense>
  );
}
