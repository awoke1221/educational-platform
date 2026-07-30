"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchJson } from "@/lib/utils/auth-fetch";

interface RegistrationItem {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  payment_method: string;
  payment_status: string;
  registration_status: string;
  coupon_code: string | null;
  payment_receipt_url: string | null;
  created_at: string;
  course_id: string;
}

export default function AdminInPersonTrainingPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const result = await authFetchJson("/api/admin/in-person-training", {
        method: "GET",
      });
      if (result.response.ok) {
        setRegistrations(result.data?.data || []);
      } else {
        setError(result.data?.error || "Unable to load registrations");
      }
    } catch (err) {
      setError("Unable to load registrations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (
    registrationId: string,
    action: "approve" | "reject",
  ) => {
    try {
      const result = await authFetchJson("/api/admin/in-person-training", {
        method: "PATCH",
        body: JSON.stringify({ registrationId, action }),
      });

      if (result.response.ok) {
        const couponCode = result.data?.data?.coupon_code;
        setMessage(
          action === "approve"
            ? couponCode
              ? `Registration approved. Coupon code: ${couponCode}`
              : "Registration approved."
            : "Registration rejected.",
        );
        setRegistrations((prev) =>
          prev.filter((item) => item.id !== registrationId),
        );
      } else {
        setError(result.data?.error || "Unable to update registration");
      }
    } catch (err) {
      setError("Unable to update registration");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0604] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">In-person training approvals</h1>
            <p className="text-sm text-white/70">
              Review registrations, approve payments, and issue coupon codes.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
            Loading registrations…
          </div>
        ) : registrations.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
            No registrations yet.
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#c9952a]/20 bg-[#140d0b]/90 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#f5c96b]">
                        {item.full_name}
                      </h2>
                      <span className="rounded-full bg-[#2b2018] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[#f5e7c4]">
                        {item.registration_status}
                      </span>
                      <span className="rounded-full bg-[#2b2018] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[#f5e7c4]">
                        {item.payment_status}
                      </span>
                    </div>
                    <div className="text-sm text-[#f5e7c4]/80">
                      <p>Phone: {item.phone_number}</p>
                      <p>Email: {item.email || "—"}</p>
                      <p>Payment method: {item.payment_method}</p>
                      <p>Course ID: {item.course_id}</p>
                      <p>
                        Submitted: {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    {item.coupon_code && (
                      <p className="text-sm text-emerald-300">
                        Coupon: {item.coupon_code}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.payment_receipt_url && (
                      <div className="w-full">
                        <a
                          href={item.payment_receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-2 inline-block rounded-lg border border-[#c9952a]/30 px-3 py-2 text-sm text-[#f5c96b] hover:bg-[#2b2018]"
                        >
                          View receipt
                        </a>
                        <img
                          src={item.payment_receipt_url}
                          alt="Payment receipt"
                          className="max-h-48 w-full rounded-xl border border-[#c9952a]/20 object-cover"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => handleAction(item.id, "approve")}
                      className="rounded-lg bg-gradient-to-r from-[#a30000] to-[#c9952a] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "reject")}
                      className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
