"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFetchJson } from "@/lib/utils/auth-fetch";

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

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token && !queryUserId) {
      setLoadingUser(false);
      return;
    }

    const loadData = async () => {
      setLoadingUser(true);

      try {
        if (token) {
          const profileResult = await authFetchJson("/api/user/profile", {
            method: "GET",
          });
          if (profileResult.response.ok) {
            setProfile(profileResult.data.data || null);
            setResolvedUserId(
              (prev) => prev || profileResult.data.data?.id || null,
            );
          }
        }

        if (courseId) {
          const courseRes = await fetch(`/api/courses/${courseId}`);
          const courseData = await courseRes.json();
          if (courseRes.ok && courseData.data) {
            setCourse(courseData.data);
          }
        }

        if (token && courseId) {
          const enrResult = await authFetchJson(`/api/enrollments`, {
            method: "GET",
          });
          const enrData = enrResult.data;
          const items = enrData.data?.data || enrData.data || [];
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
        }
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
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed");
        } else {
          setMessage(
            `Receipt submitted for ${course?.title || "this course"}. Awaiting admin review.`,
          );
          // optionally redirect after a short delay
          setTimeout(() => {
            router.push(redirectTo as string);
          }, 2500);
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
                ? "Your receipt is under review. Admin will approve access shortly and then you can access the course content."
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

        <div className="space-y-4">
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
                Upload a local payment receipt. This is reviewed and approved by
                admin before you gain access.
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
                Use the international payment method and then upload the receipt
                for admin approval.
              </p>
            </button>
          </div>

          <div className="p-4 border rounded">
            {method === "local" ? (
              <div>
                <p className="font-semibold">Pay with Telebirr</p>
                <p className="text-sm text-gray-600 mt-1">
                  Scan the Telebirr QR or send to phone number:{" "}
                  <strong>+2519XXXXXXX</strong>
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

          {courseStatus === "active" ? (
            <div className="rounded-2xl bg-white p-4 border border-border-light text-sm text-[#334155]">
              <p className="font-semibold">Course access already active</p>
              <p className="mt-2 text-text-muted">
                No receipt upload is required because you already have access to
                this course.
              </p>
            </div>
          ) : courseStatus === "processing" ? (
            <div className="rounded-2xl bg-white p-4 border border-[#FEE2E2] text-sm text-[#7F1D1D]">
              <p className="font-semibold">Receipt already submitted</p>
              <p className="mt-2 text-[#7F1D1D]">
                Your receipt is under review. If you need to update it, please
                contact support or wait for admin approval.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Upload receipt image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-text-muted mt-2">
                Upload the receipt after you pay via the selected method. Admin
                will verify and approve your enrollment.
              </p>
              {error && <p className="text-red-600 mt-2">{error}</p>}
              {message && <p className="text-green-600 mt-2">{message}</p>}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={uploadReceipt}
              disabled={loading || courseStatus !== "none"}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded disabled:opacity-50"
            >
              {courseStatus === "active"
                ? "Already active"
                : courseStatus === "processing"
                  ? "Receipt submitted"
                  : loading
                    ? "Uploading..."
                    : "Submit Receipt"}
            </button>
            <button
              onClick={() => router.push(redirectTo as string)}
              className="px-4 py-2 border rounded"
            >
              Skip / Back
            </button>
          </div>
        </div>
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
