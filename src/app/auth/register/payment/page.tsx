"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [method, setMethod] = useState<"local" | "diaspora">("local");
  const [channel, setChannel] = useState<string>("telebirr");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return <div className="p-6">Missing user id. Go back and try again.</div>;
  }

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
        const res = await fetch(`/api/registrations/${userId}/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: method,
            paymentChannel: channel,
            filename: file.name,
            fileBase64: base64,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed");
        } else {
          setMessage(
            "We received your payment receipt. Awaiting admin review.",
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#F0FEFF] to-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border-t-4 border-[#00BCD4]">
        <h1 className="text-2xl font-bold text-center mb-4">
          Complete Payment
        </h1>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={method === "local"}
                onChange={() => {
                  setMethod("local");
                  setChannel("telebirr");
                }}
              />
              <span className="font-medium">Local (Telebirr)</span>
            </label>
            <label className="flex items-center gap-3 mt-2">
              <input
                type="radio"
                checked={method === "diaspora"}
                onChange={() => {
                  setMethod("diaspora");
                  setChannel("paypal");
                }}
              />
              <span className="font-medium">Diaspora (PayPal)</span>
            </label>
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

          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              Upload receipt image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {error && <p className="text-red-600 mt-2">{error}</p>}
            {message && <p className="text-green-600 mt-2">{message}</p>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={uploadReceipt}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white rounded"
            >
              {loading ? "Uploading..." : "Submit Receipt"}
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
