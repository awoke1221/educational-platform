"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { cachedFetch, cachedAuthFetchJson } from "@/lib/utils/cache";

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
    return <div className="p-6">Loading payment details...</div>;
  }

  if (!resolvedUserId) {
    return (
      <div className="p-6">
        Unable to determine your user account. Please log in and try again.
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-surface to-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border-t-4 border-primary">
        <h1 className="text-2xl font-bold text-center mb-4">
          Complete Payment
        </h1>

        <div className="rounded-3xl bg-surface border border-border-light p-4 text-sm text-primary mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="font-semibold">{courseLabel}</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-2">
            {courseStatus === "active"
              ? "You already have access to this course. Continue learning from your dashboard."
              : courseStatus === "processing"
                ? "Your receipt is under review. Admin approval is required before course access becomes active."
                : queryUserId
                  ? "Complete payment for your new registration by uploading a receipt."
                  : "Select a payment method, upload your receipt, and our admin team will review it."}
          </p>
          {(courseStatus === "active" || courseStatus === "processing") && (
            <div className="mt-4 rounded-2xl bg-white p-4 border border-border-light text-sm text-[#334155]">
              <p className="font-semibold mb-2">Current course status</p>
              {courseStatus === "active" ? (
                <p>
                  You have active access to this course. Open the course page to
                  continue learning immediately.
                </p>
              ) : (
                <p>
                  Your receipt submission is pending review. Admin approval is
                  required before course access becomes active.
                </p>
              )}
            </div>
          )}
        </div>

        {success ? (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-emerald-900 mb-2">
              Thank you for your payment!
            </h2>
            <p className="text-sm text-emerald-700 max-w-xl mx-auto">
              We have received your receipt for {course?.title || "the course"}.
              The payment will be verified by admin, and your course access will
              become active once approved.
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-4 py-2 bg-primary text-white rounded-full"
              >
                Back to dashboard
              </button>
              <button
                onClick={() => setSuccess(false)}
                className="px-4 py-2 border border-border-light rounded-full"
              >
                Submit another receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMethod("local");
                  setChannel("telebirr");
                }}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  method === "local"
                    ? "border-primary bg-border-light shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-9 w-9 rounded-full bg-primary text-white items-center justify-center">
                    T
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm">Local payment</h3>
                    <p className="text-xs text-gray-500">
                      Telebirr / bank transfer
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Pay locally, then upload the receipt for admin verification.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("diaspora");
                  setChannel("paypal");
                }}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  method === "diaspora"
                    ? "border-[#7C3AED] bg-[#F3E8FF] shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-9 w-9 rounded-full bg-[#7C3AED] text-white items-center justify-center">
                    D
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm">Diaspora payment</h3>
                    <p className="text-xs text-gray-500">
                      PayPal / international transfer
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Send the international payment and upload the receipt.
                </p>
              </button>
            </div>

            <div className="p-4 border rounded bg-surface">
              {method === "local" ? (
                <div>
                  <p className="font-semibold">Pay with Telebirr</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Scan the Telebirr QR or send to phone number:{" "}
                    <strong>+2519XXXXXXX</strong>
                  </p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Amount:</span>{" "}
                    {(course?.currency || "ETB") + " " + course?.price}
                  </p>
                  <div className="mt-3">
                    <img
                      src="/telebirr qrcode.jpeg"
                      alt="telebirr-qr"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Pay with PayPal</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Send payment to: <strong>payments@example.com</strong>
                  </p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Amount:</span>{" "}
                    {(course?.currency || "ETB") + " " + course?.price}
                  </p>
                  <div className="mt-3">
                    <img
                      src="/paypal qrcode.png"
                      alt="paypal-qr"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 border border-border-light">
              <p className="text-sm text-gray-700 mb-3">
                Step 1: Confirm your contact details. Admin will use this
                information for verification.
              </p>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-border-light px-4 py-3 text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-border-light px-4 py-3 text-sm"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={proceedToReceipt}
                disabled={loading || courseStatus !== "none"}
                className="px-4 py-3 bg-gradient-to-r from-[#0f1b3a] to-[#1b2a4a] text-white rounded-xl hover:shadow-lg hover:shadow-[#1b2a4a]/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              >
                Continue to receipt upload
              </button>
              <button
                onClick={() => router.push(redirectTo as string)}
                className="px-4 py-3 border border-border-light rounded-xl"
              >
                Cancel
              </button>
            </div>

            {step === "receipt" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface p-4 border border-border-light">
                  <p className="font-semibold text-sm">
                    Step 2: Upload your receipt
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose the receipt image you received from the payment
                    provider.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="mt-3"
                  />
                  {file && (
                    <p className="text-sm text-gray-700 mt-2">
                      Selected file: <strong>{file.name}</strong>
                    </p>
                  )}
                </div>

                {error && <p className="text-red-600">{error}</p>}
                {message && <p className="text-emerald-700">{message}</p>}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={uploadReceipt}
                    disabled={loading || courseStatus !== "none"}
                    className="px-4 py-3 bg-primary text-white rounded-xl disabled:opacity-50"
                  >
                    {loading ? "Uploading..." : "Send payment receipt"}
                  </button>
                  <button
                    onClick={() => setStep("details")}
                    className="px-4 py-3 border border-border-light rounded-xl"
                  >
                    Back to details
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
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PaymentForm />
    </Suspense>
  );
}
