"use client";
import { Suspense, useEffect, useState, useRef } from "react";
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

  const [paymentType, setPaymentType] = useState<"local" | "diaspora" | null>(
    null,
  );
  const [localChannel, setLocalChannel] = useState<"telebirr" | "cbbirr">(
    "telebirr",
  );
  const [diasporaChannel, setDiasporaChannel] = useState<
    "paypal" | "creditcard"
  >("paypal");
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
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const revokeRef = useRef<string | null>(null);
  const [step, setStep] = useState<"type-selection" | "details" | "receipt">(
    "type-selection",
  );
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
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
              const items =
                enrResult.data?.data?.data ||
                enrResult.data?.data ||
                enrResult.data ||
                [];
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

  const proceedToDetails = () => {
    if (!paymentType) return;
    setError(null);
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

  const uploadReceipt = async () => {
    if (!file) return setError("Please select a receipt image");
    setLoading(true);
    setError(null);
    try {
      const channel = paymentType === "local" ? localChannel : diasporaChannel;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(
          `/api/registrations/${resolvedUserId}/receipt`,
          {
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
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed");
        } else {
          setMessage("success");
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
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 border border-emerald-700 p-8 backdrop-blur animate-fadeIn">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-bounce">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-emerald-100 mb-1">
                🎉 Receipt Submitted Successfully!
              </h2>
              <p className="text-emerald-200/80 text-sm">
                Your payment receipt has been received and is being processed.
              </p>
            </div>

            {/* Payment Summary Card */}
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
                <span className="text-slate-400 text-sm">💰 Amount Paid</span>
                <span className="text-accent font-bold text-lg">
                  {(course?.currency || "ETB") + " " + (course?.price ?? "—")}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 text-sm">📊 Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/40 border border-amber-600/50 text-amber-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Pending Review
                </span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-800 border border-blue-700/50 p-6 mb-6">
              <p className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
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
            <div className="text-center mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-600">
              <p className="text-slate-300 text-sm leading-relaxed">
                ⏳ Please wait while we verify your payment. You will be
                notified once your enrollment is confirmed. If you have any
                questions, please contact our support team.
              </p>
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
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
                className="px-6 py-3 border-2 border-emerald-500 text-emerald-300 rounded-full font-semibold hover:bg-emerald-500/10 transition-all duration-300"
              >
                Submit Another Receipt
              </button>
            </div>
          </div>
        ) : step === "type-selection" ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-slate-300 text-lg font-semibold">
                How would you like to pay?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Select your payment location to continue
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Payment Option */}
              <button
                onClick={() => {
                  setPaymentType("local");
                  proceedToDetails();
                }}
                className="group relative p-6 rounded-2xl border-2 border-slate-600 bg-gradient-to-br from-slate-800 to-slate-700 hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full text-white group-hover:scale-110 transition-transform">
                    <svg
                      className="w-7 h-7"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      Local Payment
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Pay within Ethiopia using Telebirr or CBE Birr
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <svg
                    className="w-6 h-6 text-accent inline-block group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>

              {/* Diaspora Payment Option */}
              <button
                onClick={() => {
                  setPaymentType("diaspora");
                  proceedToDetails();
                }}
                className="group relative p-6 rounded-2xl border-2 border-slate-600 bg-gradient-to-br from-slate-800 to-slate-700 hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full text-white group-hover:scale-110 transition-transform">
                    <svg
                      className="w-7 h-7"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      Diaspora Payment
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Pay internationally using PayPal or Credit Card
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <svg
                    className="w-6 h-6 text-accent inline-block group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-6 py-3 border-2 border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all duration-300 font-semibold w-full"
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
                        <img
                          src="/telebirr qrcode.jpeg"
                          alt="telebirr-qr"
                          className="w-48 h-48 object-contain"
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

            {/* Payment Methods for Diaspora */}
            {paymentType === "diaspora" && (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm font-semibold">
                  💳 Select Payment Method
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setDiasporaChannel("paypal")}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      diasporaChannel === "paypal"
                        ? "border-accent bg-accent/10"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="text-lg">🌐</span> PayPal
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PayPal payment method
                    </p>
                  </button>
                  <button
                    onClick={() => setDiasporaChannel("creditcard")}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      diasporaChannel === "creditcard"
                        ? "border-accent bg-accent/10"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="text-lg">💳</span> Credit Card
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      International credit card
                    </p>
                  </button>
                </div>

                {/* Display Selected Diaspora Payment Method */}
                <div className="p-6 border border-slate-600 rounded-2xl bg-slate-800/50 backdrop-blur">
                  {diasporaChannel === "paypal" ? (
                    <div key="paypal-details">
                      <p className="font-bold text-accent mb-2 flex items-center gap-2">
                        <span className="text-2xl">🌐</span> Pay with PayPal
                      </p>
                      <p className="text-slate-300 text-sm mt-2">
                        Send payment to:{" "}
                        <span className="font-mono font-bold text-accent">
                          payments@example.com
                        </span>
                      </p>
                      <p className="mt-3 text-sm text-slate-200">
                        <span className="font-semibold text-accent">
                          Amount:
                        </span>{" "}
                        <span className="text-lg font-bold">
                          {(course?.currency || "USD") +
                            " " +
                            (course?.price
                              ? (course.price * 0.012).toFixed(2)
                              : "0")}
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
                  ) : (
                    <div key="creditcard-details">
                      <p className="font-bold text-accent mb-2 flex items-center gap-2">
                        <span className="text-2xl">💳</span> Pay with Credit
                        Card
                      </p>
                      <p className="text-slate-300 text-sm mt-2">
                        You will be redirected to our secure payment gateway to
                        complete your credit card transaction.
                      </p>
                      <p className="mt-4 text-sm text-slate-200">
                        <span className="font-semibold text-accent">
                          Amount:
                        </span>{" "}
                        <span className="text-lg font-bold">
                          {(course?.currency || "USD") +
                            " " +
                            (course?.price
                              ? (course.price * 0.012).toFixed(2)
                              : "0")}
                        </span>
                      </p>
                      <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
                        <p className="text-slate-400 text-sm">
                          🔒 All credit card transactions are secured and
                          encrypted for your protection.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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

            <div className="flex flex-wrap gap-3">
              <button
                onClick={proceedToReceipt}
                disabled={loading || courseStatus !== "none"}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-secondary text-slate-900 rounded-lg hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                Continue to Receipt Upload
              </button>
              <button
                onClick={() => {
                  setPaymentType(null);
                  setStep("type-selection");
                  setError(null);
                }}
                className="px-6 py-3 border-2 border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all duration-300 font-semibold"
              >
                Back to Payment Type
              </button>
            </div>
          </div>
        ) : step === "receipt" ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 border border-slate-600">
              <p className="font-bold text-accent text-sm flex items-center gap-2 mb-2">
                <span className="text-lg">📸</span> Step 3: Upload your receipt
              </p>
              <p className="text-slate-300 text-sm mb-4">
                Choose the receipt image you received from the payment provider.
                Please ensure the receipt clearly shows the transaction details.
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
                <div className="mt-4 space-y-4">
                  {/* Image Preview */}
                  <div className="rounded-xl border-2 border-slate-600 bg-slate-900 overflow-hidden">
                    <img
                      src={filePreviewUrl ?? undefined}
                      alt="Receipt preview"
                      className="w-full max-h-72 object-contain p-2"
                    />
                  </div>
                  {/* File Info */}
                  <div className="p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg flex items-center gap-3">
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
