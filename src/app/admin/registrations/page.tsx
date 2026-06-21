"use client";
import { useEffect, useState, useCallback } from "react";
import { authFetchJson } from "@/lib/utils/auth-fetch";

// ── Types ──
interface PendingRegistration {
  // enrollment entry id when available
  entryId?: string;
  id: string; // user id
  userId?: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  pendingReceiptUrl: string | null;
  paymentMethod: string | null;
  paymentType?: string | null;
  paymentStatus: string;
  enrollmentStatus?: string | null;
  createdAt: string;
  courseId?: string | null;
  courseTitle?: string | null;
  coursePrice?: number | null;
}

// ── Receipt Zoom Modal ──
function ReceiptModal({
  url,
  username,
  onClose,
}: {
  url: string;
  username: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[90vh] mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <span className="font-medium text-gray-700">
            Receipt — {username}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex items-center justify-center bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Receipt for ${username}`}
            className="max-w-full max-h-[70vh] object-contain rounded shadow"
          />
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ──
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-md w-full">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ──
export default function AdminRegistrationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Receipt modal
  const [receiptModal, setReceiptModal] = useState<{
    url: string;
    username: string;
  } | null>(null);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{
    type: "approve" | "reject";
    id: string; // entry id or user id for display
    username: string;
    userId?: string;
    courseId?: string | null;
    courseTitle?: string | null;
  } | null>(null);

  // Get token on mount
  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

  // ── Fetch pending registrations ──
  const fetchPending = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await authFetchJson("/api/registrations/pending", {
        method: "GET",
      });
      const data = result.data;
      if (!result.response.ok) {
        if (result.response.status === 401) {
          setError("Unauthorized — please login again");
        } else {
          setError(data.error || "Failed to load");
        }
      } else {
        setItems(data.data || []);
      }
    } catch {
      setError("Failed to load pending registrations");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ── Approve ──
  const handleApprove = async () => {
    if (!confirm || confirm.type !== "approve") return;
    const id = confirm.id;
    setActionLoading(id);
    setConfirm(null);
    try {
      // Use userId for the endpoint and include courseId in body when present
      const userId = (confirm && confirm.userId) || id;
      const body: any = {};
      if (confirm?.courseId) body.courseId = confirm.courseId;
      const result = await authFetchJson(
        `/api/registrations/${userId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = result.data;
      if (!result.response.ok) {
        alert(data.error || "Approval failed");
      } else {
        setItems((prev) =>
          prev.filter((it) => it.entryId !== id && it.id !== id),
        );
      }
    } catch {
      alert("Approval failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject ──
  const handleReject = async () => {
    if (!confirm || confirm.type !== "reject") return;
    const id = confirm.id;
    setActionLoading(id);
    setConfirm(null);
    try {
      const userId = (confirm && confirm.userId) || id;
      const body: any = { reason: "Payment receipt invalid or insufficient" };
      if (confirm?.courseId) body.courseId = confirm.courseId;
      const result = await authFetchJson(
        `/api/registrations/${userId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = result.data;
      if (!result.response.ok) {
        alert(data.error || "Rejection failed");
      } else {
        setItems((prev) =>
          prev.filter((it) => it.entryId !== id && it.id !== id),
        );
      }
    } catch {
      alert("Rejection failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Payment method display helper ──
  const paymentLabel = (method: string | null) => {
    switch (method) {
      case "telebirr":
      case "local":
        return {
          label: "Local (Telebirr)",
          color: "bg-blue-100 text-blue-800",
        };
      case "paypal":
      case "diaspora":
        return {
          label: "Diaspora (PayPal)",
          color: "bg-purple-100 text-purple-800",
        };
      default:
        return { label: method || "N/A", color: "bg-gray-100 text-gray-800" };
    }
  };

  const paymentStatusLabel = (status: string) => {
    switch (status) {
      case "submitted":
        return "Payment in progress";
      case "pending":
        return "Pending payment review";
      case "approved":
        return "Payment approved";
      case "rejected":
        return "Payment rejected";
      default:
        return status?.replace(/_/g, " ") || "Unknown status";
    }
  };

  const paymentStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  // ── Not logged in state ──
  if (!token) {
    return (
      <div className="p-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Login Required
        </h2>
        <p className="text-gray-500 mb-6">
          You need to be logged in as an admin to review registrations.
        </p>
        <a
          href="/auth/login"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-light transition-colors"
        >
          Go to Login
        </a>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-600">
          Loading pending registrations...
        </span>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          {error.includes("login again") ? (
            <a
              href="/auth/login"
              className="mt-3 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
            >
              Login Again
            </a>
          ) : (
            <button
              onClick={fetchPending}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pending Registrations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} registration{items.length !== 1 ? "s" : ""} awaiting
            review
          </p>
        </div>
        <button
          onClick={fetchPending}
          className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <span>↻</span> Refresh
        </button>
      </div>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-700">
            All caught up!
          </h2>
          <p className="text-gray-500 mt-1">
            No pending registrations to review.
          </p>
        </div>
      )}

      {/* ── List ── */}
      <div className="space-y-4">
        {items.map((it) => {
          const pm = paymentLabel(it.paymentMethod);
          const isProcessing = actionLoading === it.id;

          return (
            <div
              key={it.id}
              className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}
            >
              {/* Receipt thumbnail */}
              <div className="flex-shrink-0">
                {it.pendingReceiptUrl ? (
                  <button
                    onClick={() =>
                      setReceiptModal({
                        url: it.pendingReceiptUrl!,
                        username: it.fullName,
                      })
                    }
                    className="block w-40 h-32 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors group"
                    title="Click to zoom"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.pendingReceiptUrl}
                      alt="Payment receipt"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ) : (
                  <div className="w-40 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300">
                    No receipt
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg truncate">
                      {it.fullName}
                    </h3>
                    <p className="text-sm text-gray-500">@{it.username}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {it.courseId
                        ? "Course enrollment"
                        : "Account registration"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColor(
                        it.paymentStatus,
                      )}`}
                    >
                      {paymentStatusLabel(it.paymentStatus)}
                    </span>
                    {it.paymentType && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                        {it.paymentType === "diaspora" ? "Diaspora" : "Local"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-400">Email:</span>{" "}
                    <span className="text-gray-700">{it.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>{" "}
                    <span className="text-gray-700">{it.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Course:</span>{" "}
                    <span className="text-gray-700">
                      {it.courseTitle || "(not specified)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price:</span>{" "}
                    <span className="text-gray-700">
                      {it.coursePrice != null ? `ETB ${it.coursePrice}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Payment method:</span>{" "}
                    <span className="text-gray-700">
                      {paymentLabel(it.paymentMethod).label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>{" "}
                    <span className="text-gray-700">
                      {paymentStatusLabel(it.paymentStatus)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Submitted:</span>{" "}
                    <span className="text-gray-700">
                      {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      setConfirm({
                        type: "approve",
                        id: it.entryId || it.id,
                        username: it.fullName,
                        userId: it.id,
                        courseId: it.courseId,
                        courseTitle: it.courseTitle,
                      })
                    }
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? "..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() =>
                      setConfirm({
                        type: "reject",
                        id: it.entryId || it.id,
                        username: it.fullName,
                        userId: it.id,
                        courseId: it.courseId,
                      })
                    }
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? "..." : "✕ Reject"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Receipt zoom modal ── */}
      {receiptModal && (
        <ReceiptModal
          url={receiptModal.url}
          username={receiptModal.username}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirm && (
        <ConfirmDialog
          title={
            confirm.type === "approve"
              ? "Approve Registration"
              : "Reject Registration"
          }
          message={
            confirm.type === "approve"
              ? confirm.courseTitle
                ? `Approve payment and activate access to "${confirm.courseTitle}" for ${confirm.username}?`
                : `Approve ${confirm.username}'s account registration?`
              : confirm.courseTitle
                ? `Reject ${confirm.username}'s payment for "${confirm.courseTitle}"?`
                : `Reject ${confirm.username}'s registration? They will not be able to log in.`
          }
          confirmLabel={confirm.type === "approve" ? "Approve" : "Reject"}
          confirmColor={
            confirm.type === "approve"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }
          onConfirm={confirm.type === "approve" ? handleApprove : handleReject}
          onCancel={() => setConfirm(null)}
          loading={actionLoading === confirm.id}
        />
      )}
    </div>
  );
}
