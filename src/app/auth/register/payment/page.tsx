"use client";
import Image from "next/image";
import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch, cachedAuthFetchJson } from "@/lib/utils/cache";

function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUserId = searchParams.get("userId");
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const courseId = searchParams.get("courseId");

  const [paymentType, setPaymentType] = useState<"local" | "diaspora" | null>(
    null,
  );
  const [localChannel, setLocalChannel] = useState<"telebirr" | "cbbirr">(
    "telebirr",
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(
    queryUserId,
  );
  const [token] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  });
  const [loadingUser, setLoadingUser] = useState<boolean>(
    !!queryUserId || Boolean(token),
  );
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
    "active" | "processing" | "rejected" | "none"
  >("none");
  const [fullName, setFullName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const revokeRef = useRef<string | null>(null);
  const [step, setStep] = useState<"type-selection" | "details" | "receipt">(
    "type-selection",
  );
  const [success, setSuccess] = useState(false);
  const [showRejectedNotice, setShowRejectedNotice] = useState(true);

  useEffect(() => {
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!token && !queryUserId) {
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
              type EnrollmentItem = {
                courseId?: string;
                course?: { id?: string };
                status?: string;
              };
              const items: EnrollmentItem[] =
                enrResult.data?.data?.data ||
                enrResult.data?.data ||
                enrResult.data ||
                [];
              const active = items.some(
                (e) =>
                  (e.courseId || e.course?.id) === courseId &&
                  e.status === "active",
              );
              const rejected = items.some(
                (e) =>
                  (e.courseId || e.course?.id) === courseId &&
                  e.status === "rejected",
              );
              const processing = items.some(
                (e) =>
                  (e.courseId || e.course?.id) === courseId &&
                  e.status === "processing",
              );
              setCourseStatus(
                active
                  ? "active"
                  : rejected
                    ? "rejected"
                    : processing
                      ? "processing"
                      : "none",
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
        <div className="w-full max-w-2xl rounded-3xl border border-secondary/25 bg-primary/95 p-8 shadow-2xl shadow-primary-dark/30">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
            <p className="text-white/80 text-lg">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resolvedUserId) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="w-full max-w-2xl rounded-3xl border border-secondary/25 bg-primary/95 p-8 shadow-2xl shadow-primary-dark/30">
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
            <p className="text-white/75 mb-6">
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
  const isRejected = courseStatus === "rejected";
  const showStatusOnly =
    !success && (isActive || isPending || (isRejected && showRejectedNotice));

  const statusLabel =
    courseStatus === "active"
      ? "Active access"
      : courseStatus === "processing"
        ? "Pending approval"
        : courseStatus === "rejected"
          ? "Payment rejected"
          : "Receipt required";

  const statusColor =
    courseStatus === "active"
      ? "bg-emerald-100 text-emerald-800"
      : courseStatus === "processing"
        ? "bg-amber-100 text-amber-800"
        : courseStatus === "rejected"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-800";

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      setFilePreviewUrl(null);
      return setFile(null);
    }
    if (!f.type.startsWith("image/")) return setError("Only images allowed");
    if (f.size > 5 * 1024 * 1024) return setError("Max 5MB file size");
    // Revoke previous preview URL
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current);
    }
    const url = URL.createObjectURL(f);
    revokeRef.current = url;
    setFilePreviewUrl(url);
    setFile(f);
  };

  const proceedToDetails = (type: "local" | "diaspora") => {
    setError(null);
    setPaymentType(type);
    setStep("details");
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

  const startPayPalPayment = async () => {
    if (!course) return setError("Course details are still loading.");
    if (!fullName.trim()) return setError("Please enter your full name.");
    setLoading(true);
    setError(null);
    try {
      const result = await authFetchJson("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          paymentType: "diaspora",
          courseId: course.id,
          amount: Number((course.price * 0.012).toFixed(2)),
        }),
      });
      if (!result.response.ok) {
        setError(result.data?.error || "Unable to start PayPal payment");
        return;
      }
      const checkoutUrl =
        result.data?.data?.checkoutUrl || result.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("PayPal checkout URL was not returned");
      window.location.assign(checkoutUrl);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to start PayPal payment",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (paymentType === "diaspora") {
      void startPayPalPayment();
    } else {
      proceedToReceipt();
    }
  };

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Unable to read file"));
          return;
        }
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Unable to read file"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });
  };

  const uploadReceipt = async () => {
    if (!file) return setError("Please select a receipt image");
    setLoading(true);
    setError(null);
    try {
      const channel = localChannel;
      const base64 = await readFileAsDataUrl(file);
      const res = await fetch(`/api/registrations/${resolvedUserId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: paymentType,
          paymentChannel: channel,
          filename: file.name,
          fileBase64: base64,
          courseId,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setMessage("success");
      setSuccess(true);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.18),transparent_32%),linear-gradient(135deg,var(--primary-dark),var(--primary),var(--primary-light))] px-3 py-8 sm:px-6 sm:py-12 lg:py-16">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-secondary opacity-10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-secondary/30 bg-primary/95 p-4 shadow-2xl shadow-primary-dark/40 sm:p-7 lg:p-9">
        {!success && !showStatusOnly && (
          <>
            {/* Header with icon */}
            <div className="mb-7 text-center sm:mb-8">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-secondary sm:h-16 sm:w-16">
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
              <h1 className="mb-2 text-2xl font-bold text-accent sm:text-3xl">
                Complete Payment
              </h1>
              <p className="text-white/75">
                Secure payment to unlock your learning journey
              </p>
            </div>

            {/* Course info card */}
            <div className="mb-6 rounded-2xl border border-secondary/20 bg-white/[0.07] p-4 backdrop-blur sm:p-6">
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="mb-1 text-sm uppercase tracking-wider text-accent">
                    Course Details
                  </p>
                  <p className="break-words text-lg font-bold text-white">
                    {courseLabel}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-4 py-2 text-xs font-bold ${statusColor}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/70">
                {courseStatus === "active"
                  ? "🎉 You already have access to this course. Continue learning from your dashboard."
                  : courseStatus === "processing"
                    ? "⏳ Your receipt is under review. Admin approval is required before course access becomes active."
                    : courseStatus === "rejected"
                      ? "Unfortunately, your submitted payment receipt was rejected by our team. Please upload a new receipt or contact support for assistance."
                      : queryUserId
                        ? "📋 Complete payment for your new registration by uploading a receipt."
                        : "🔒 Select a payment method, upload your receipt, and our admin team will review it."}
              </p>
              {(courseStatus === "active" ||
                courseStatus === "processing" ||
                courseStatus === "rejected") && (
                <div className="mt-4 rounded-lg border border-secondary/15 bg-primary-dark/60 p-4">
                  <p className="font-semibold text-accent mb-2">
                    Current course status
                  </p>
                  <p className="text-sm text-white/70">
                    {courseStatus === "active"
                      ? "✅ You have active access to this course. Open the course page to continue learning immediately."
                      : courseStatus === "processing"
                        ? "⏱️ Your receipt submission is pending review. Admin approval is required before course access becomes active."
                        : "❌ Your payment receipt was rejected. Upload a new receipt to continue or contact support if you need help."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {success ? (
          <div className="animate-fadeIn rounded-3xl border border-secondary/30 bg-gradient-to-br from-primary-light via-primary to-primary-dark p-4 shadow-xl shadow-primary-dark/30 sm:p-8">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-accent text-primary-dark shadow-lg shadow-secondary/30 animate-bounce">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h2 className="mb-1 text-2xl font-bold text-white">
                🎉 Receipt Submitted Successfully!
              </h2>
              <p className="text-white/70 text-sm">
                Your payment receipt has been received and is being processed.
              </p>
            </div>

            {/* Payment Summary Card */}
            <div className="mb-6 space-y-4 rounded-2xl border border-secondary/20 bg-white/[0.07] p-4 sm:p-6">
              <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
                📄 Payment Summary
              </p>

              <div className="flex flex-col gap-1 border-b border-white/10 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-400 text-sm">👤 Student Name</span>
                <span className="text-white font-semibold text-sm text-right">
                  {fullName || profile?.fullName || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1 border-b border-white/10 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-400 text-sm">📚 Course</span>
                <span className="text-white font-semibold text-sm text-right">
                  {course?.title || "Selected Course"}
                </span>
              </div>

              <div className="flex flex-col gap-1 border-b border-white/10 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-400 text-sm">💰 Amount Paid</span>
                <span className="text-accent font-bold text-lg">
                  {(course?.currency || "ETB") + " " + (course?.price ?? "—")}
                </span>
              </div>

              <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-400 text-sm">📊 Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/40 border border-amber-600/50 text-amber-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Pending Review
                </span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mb-6 rounded-2xl border border-secondary/20 bg-primary-dark/60 p-4 sm:p-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
                <span className="text-lg">👣</span> Next Steps
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700 flex items-center justify-center text-blue-300 text-xs font-bold">
                    1
                  </span>
                  <span>
                    Our admin team will review your payment receipt for{" "}
                    <strong className="text-white">
                      {course?.title || "the course"}
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700 flex items-center justify-center text-blue-300 text-xs font-bold">
                    2
                  </span>
                  <span>
                    Once your payment is{" "}
                    <strong className="text-emerald-400">approved</strong>, your
                    course access will be activated automatically.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700 flex items-center justify-center text-blue-300 text-xs font-bold">
                    3
                  </span>
                  <span>
                    You can then{" "}
                    <strong className="text-accent">start learning</strong> and
                    access all course materials from your dashboard.
                  </span>
                </li>
              </ul>
            </div>

            {/* Waiting Message */}
            <div className="mb-6 rounded-xl border border-secondary/20 bg-white/[0.05] p-3 text-center sm:p-4">
              <p className="text-sm leading-relaxed text-white/70">
                ⏳ Please wait while we verify your payment. You will be
                notified once your enrollment is confirmed. If you have any
                questions, please contact our support team.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="w-full rounded-lg bg-gradient-to-r from-secondary to-accent px-6 py-3 font-semibold text-primary-dark transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/30 sm:w-auto"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setFile(null);
                  setStep("type-selection");
                  setPaymentType(null);
                  setMessage(null);
                }}
                className="w-full rounded-lg border border-secondary/60 px-6 py-3 font-semibold text-accent transition-all duration-300 hover:bg-secondary/10 sm:w-auto"
              >
                Submit Another Receipt
              </button>
            </div>
          </div>
        ) : showStatusOnly ? (
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700 p-8 backdrop-blur animate-fadeIn">
            <div className="text-center mb-6">
              <div
                className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${
                  isRejected
                    ? "bg-red-500 shadow-red-500/30"
                    : "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-500/30"
                }`}
              >
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isRejected ? (
                    <path d="M6.343 6.343l11.314 11.314m0-11.314L6.343 17.657" />
                  ) : (
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  )}
                </svg>
              </div>
              <h2
                className={`text-2xl font-bold mb-1 ${isRejected ? "text-red-100" : "text-emerald-100"}`}
              >
                {isRejected
                  ? "🚫 Payment Not Approved"
                  : isActive
                    ? "🎉 Payment Approved"
                    : "⏳ Payment Pending Review"}
              </h2>
              <p
                className={`text-sm ${isRejected ? "text-red-200/80" : "text-emerald-200/80"}`}
              >
                {isRejected
                  ? "Our team reviewed your submission and did not approve the payment. Please re-submit a valid receipt or contact support for help."
                  : isActive
                    ? "Your payment has been approved and your course access is now active."
                    : isRejected
                      ? "Your payment receipt was rejected by our team. Please upload a corrected receipt or contact support for assistance."
                      : "Your receipt is under review. We will notify you once approval is complete."}
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 p-6 mb-6 space-y-4">
              <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
                📄 Payment Summary
              </p>

              <div className="flex items-center justify-between py-2 border-b border-slate-600/50">
                <span className="text-slate-400 text-sm">👤 Student Name</span>
                <span className="text-white font-semibold text-sm text-right">
                  {fullName || profile?.fullName || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-600/50">
                <span className="text-slate-400 text-sm">📚 Course</span>
                <span className="text-white font-semibold text-sm text-right">
                  {course?.title || "Selected Course"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-600/50">
                <span className="text-slate-400 text-sm">💰 Amount</span>
                <span className="text-accent font-bold text-lg">
                  {(course?.currency || "ETB") + " " + (course?.price ?? "—")}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 text-sm">📊 Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-900/30 border border-emerald-600/50 text-emerald-300"
                      : isRejected
                        ? "bg-red-900/30 border border-red-600/50 text-red-300"
                        : "bg-amber-900/40 border border-amber-600/50 text-amber-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRejected ? "bg-red-400" : "bg-amber-400"
                    } animate-pulse`}
                  ></span>
                  {isActive
                    ? "Approved"
                    : isRejected
                      ? "Rejected"
                      : "Reviewing"}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                ← Back to Dashboard
              </button>
              {isRejected ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectedNotice(false);
                    setCourseStatus("none");
                    setStep("type-selection");
                    setPaymentType(null);
                    setMessage(null);
                    setError(null);
                  }}
                  className="px-6 py-3 border-2 border-red-500 text-red-300 rounded-full font-semibold hover:bg-red-500/10 transition-all duration-300 w-full sm:w-auto"
                >
                  Upload New Receipt
                </button>
              ) : isActive ? (
                <button
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="px-6 py-3 border-2 border-emerald-500 text-emerald-300 rounded-full font-semibold hover:bg-emerald-500/10 transition-all duration-300"
                >
                  Open Course
                </button>
              ) : null}
            </div>
          </div>
        ) : step === "type-selection" ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-slate-100 text-2xl font-semibold sm:text-3xl">
                Choose your payment channel
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-slate-400 sm:text-base leading-7">
                Select the most convenient payment route for your location, then
                upload your receipt for verification. The process is secure,
                fast, and handled by our team.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => proceedToDetails("local")}
                className="group w-full relative flex min-h-[150px] flex-col justify-between rounded-[28px] border border-slate-700 bg-slate-950/95 p-5 text-left shadow-xl shadow-slate-900/20 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-accent hover:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 text-white transition-transform duration-200 group-hover:scale-105">
                    <svg
                      className="h-7 w-7"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Local Payment
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Pay within Ethiopia using Telebirr or CBE Birr.
                    </p>
                  </div>
                </div>

                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  Continue with local payment
                </span>
              </button>

              <button
                type="button"
                onClick={() => proceedToDetails("diaspora")}
                className="group w-full relative flex min-h-[150px] flex-col justify-between rounded-[28px] border border-slate-700 bg-slate-950/95 p-5 text-left shadow-xl shadow-slate-900/20 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-accent hover:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 to-blue-500 text-white transition-transform duration-200 group-hover:scale-105">
                    <svg
                      className="h-7 w-7"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Diaspora Payment
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Pay internationally using PayPal or Credit Card.
                    </p>
                  </div>
                </div>

                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  Continue with international payment
                </span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(redirectTo as string)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-6 py-3 text-sm font-semibold text-slate-300 transition duration-200 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : step === "details" ? (
          <div className="space-y-6">
            {/* Payment Methods for Local */}
            {paymentType === "local" && (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm font-semibold">
                  💳 Select Payment Method
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setLocalChannel("telebirr")}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      localChannel === "telebirr"
                        ? "border-accent bg-accent/10"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="text-lg">📱</span> Telebirr
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Scan QR or send to number
                    </p>
                  </button>
                  <button
                    onClick={() => setLocalChannel("cbbirr")}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      localChannel === "cbbirr"
                        ? "border-accent bg-accent/10"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="text-lg">🏦</span> CBE Birr
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Bank transfer payment
                    </p>
                  </button>
                </div>

                {/* Display Selected Local Payment Method */}
                <div className="p-6 border border-slate-600 rounded-2xl bg-slate-800/50 backdrop-blur">
                  {localChannel === "telebirr" ? (
                    <div key="telebirr-details">
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
                        <span className="font-semibold text-accent">
                          Amount:
                        </span>{" "}
                        <span className="text-lg font-bold">
                          {(course?.currency || "ETB") + " " + course?.price}
                        </span>
                      </p>
                      <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600 inline-block">
                        <Image
                          src="/telebirr qrcode.jpeg"
                          alt="telebirr-qr"
                          width={192}
                          height={192}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  ) : (
                    <div key="cbbirr-details">
                      <p className="font-bold text-accent mb-2 flex items-center gap-2">
                        <span className="text-2xl">🏦</span> Pay with CBE Birr
                      </p>
                      <p className="text-slate-300 text-sm mt-2">
                        Bank account details:
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-slate-200">
                        <p>
                          <span className="font-semibold text-accent">
                            Account Name:
                          </span>{" "}
                          Adonay TikTok Academy
                        </p>
                        <p>
                          <span className="font-semibold text-accent">
                            Account Number:
                          </span>{" "}
                          XXXXXXXXXXXX
                        </p>
                        <p>
                          <span className="font-semibold text-accent">
                            Bank:
                          </span>{" "}
                          Commercial Bank of Ethiopia
                        </p>
                      </div>
                      <p className="mt-4 text-sm text-slate-200">
                        <span className="font-semibold text-accent">
                          Amount:
                        </span>{" "}
                        <span className="text-lg font-bold">
                          {(course?.currency || "ETB") + " " + course?.price}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Global users go directly to the PayPal checkout page. */}
            {paymentType === "diaspora" && (
              <div className="rounded-2xl border border-blue-400/40 bg-blue-950/30 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Secure global checkout
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  Pay securely with PayPal
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Continue to PayPal to complete your international payment.
                  Your course access opens automatically after PayPal confirms
                  the payment.
                </p>
                <p className="mt-4 text-lg font-bold text-accent">
                  USD{" "}
                  {course?.price ? (course.price * 0.012).toFixed(2) : "0.00"}
                </p>
              </div>
            )}

            {/* Contact Details Form */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-600">
              <p className="text-slate-300 text-sm mb-4 flex items-center gap-2">
                <span className="text-lg">📋</span> Step 2: Confirm your contact
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleContinue}
                disabled={loading || courseStatus !== "none"}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-secondary px-5 py-3 text-primary-dark transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
              >
                {paymentType === "diaspora"
                  ? "Continue to PayPal"
                  : "Continue to Receipt Upload"}
              </button>
              <button
                onClick={() => {
                  setPaymentType(null);
                  setStep("type-selection");
                  setError(null);
                }}
                className="rounded-lg border border-white/20 px-5 py-3 text-white/75 transition-all duration-300 hover:border-secondary hover:bg-white/10 font-semibold"
              >
                Back to Payment Type
              </button>
            </div>
          </div>
        ) : step === "receipt" ? (
          <div className="space-y-5 animate-fadeIn">
            <div className="rounded-3xl border border-secondary/20 bg-primary-dark/70 p-4 shadow-2xl shadow-primary-dark/20 ring-1 ring-white/5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.24em]">
                    STEP 3 • Upload receipt
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white sm:text-3xl">
                    Finalize your payment verification
                  </h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent sm:px-4 sm:text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                  Secure upload
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
                Upload your payment receipt so our team can verify the
                transaction details. Make sure the receipt clearly shows the
                date, amount, and reference.
              </p>

              <div className="mt-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="group block cursor-pointer rounded-3xl border border-white/15 bg-white/[0.04] px-4 py-8 text-center shadow-xl shadow-primary-dark/20 transition duration-200 hover:border-accent hover:bg-white/[0.08] sm:px-5 sm:py-10"
                >
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-white/45 transition duration-200 group-hover:text-accent sm:h-14 sm:w-14"
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
                  <p className="text-base font-semibold text-white sm:text-lg">
                    Click to upload or drag and drop your receipt
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    PNG, JPG, GIF • up to 5MB
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-inner shadow-primary-dark/20 sm:p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-slate-200 font-semibold truncate">
                        {file.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/30 px-3 py-2 text-emerald-200 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Receipt selected
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <Image
                      src={filePreviewUrl ?? ""}
                      alt="Receipt preview"
                      width={720}
                      height={360}
                      className="w-full max-h-[280px] object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-3xl border border-red-700/40 bg-red-950/80 p-4 text-sm text-red-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-red-700/20 text-red-300">
                    !
                  </span>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-3xl border border-emerald-700/40 bg-emerald-950/80 p-4 text-sm text-emerald-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-700/20 text-emerald-200">
                    ✓
                  </span>
                  <p>{message}</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={uploadReceipt}
                disabled={loading || courseStatus !== "none"}
                className="inline-flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-accent to-secondary px-6 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Uploading receipt...
                  </>
                ) : (
                  <>
                    <span className="text-lg">🚀</span>
                    Send payment receipt
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="rounded-3xl border border-slate-700 bg-slate-900/95 px-6 py-3 text-sm font-semibold text-slate-200 transition duration-200 hover:border-accent hover:text-white"
              >
                Back to payment details
              </button>
            </div>
          </div>
        ) : (
          <div>No valid step selected</div>
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
