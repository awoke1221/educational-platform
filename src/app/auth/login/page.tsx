"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  validateLoginForm,
  validateEmail,
  sanitizeInput,
  normalizeInput,
  getFieldError,
} from "@/lib/validators/form-validation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time validation on blur
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validateField(field);
  };

  // Validate individual field
  const validateField = (field: string) => {
    const errors = { ...fieldErrors };

    if (field === "email") {
      const validation = validateEmail(form.email);
      if (!validation.valid) {
        errors.email = validation.message || "ልክ ያልሆነ ኢሜይል";
      } else {
        delete errors.email;
      }
    }

    if (field === "password") {
      if (!form.password || form.password.trim() === "") {
        errors.password = "የይለፍ ቃል አስገባ";
      } else if (form.password.length < 6) {
        errors.password = "የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት";
      } else {
        delete errors.password;
      }
    }

    setFieldErrors(errors);
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (touched[field]) {
      validateField(field);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate entire form
    const validation = validateLoginForm(form);
    if (!validation.isValid) {
      const errors: Record<string, string> = {};
      validation.errors.forEach((err) => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeInput(form.email),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "መግባት አልተሳካም");
      } else {
        localStorage.setItem("token", data.tokens.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.tokens.refreshToken)
          localStorage.setItem("refreshToken", data.tokens.refreshToken);
        router.push(redirectTo);
      }
    } catch {
      setError("እባክዎ ደግመው ይሞክሩ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#F0FEFF] to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border-t-4 border-[#00BCD4]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00BCD4] to-[#FF1744] bg-clip-text text-transparent text-center mb-2">
          ግባ
        </h1>
        <p className="text-[#0D3B4A] text-center text-sm mb-8 font-medium">
          ወደ መለያዎ ይግቡ
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 flex items-start gap-2">
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              ኢሜይል *
            </label>
            <input
              type="email"
              className={`w-full border-2 rounded-lg p-3 transition-all focus:outline-none focus:ring-2 bg-[#F0FEFF] ${
                touched.email && fieldErrors.email
                  ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                  : "border-[#E0F7FA] focus:ring-[#00BCD4] focus:border-[#00BCD4]"
              }`}
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              disabled={loading}
            />
            {touched.email && fieldErrors.email && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              የይለፍ ቃል *
            </label>
            <input
              type="password"
              className={`w-full border-2 rounded-lg p-3 transition-all focus:outline-none focus:ring-2 bg-[#F0FEFF] ${
                touched.password && fieldErrors.password
                  ? "border-red-400 focus:ring-red-300 focus:border-red-400"
                  : "border-[#E0F7FA] focus:ring-[#00BCD4] focus:border-[#00BCD4]"
              }`}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              disabled={loading}
            />
            {touched.password && fieldErrors.password && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || Object.keys(fieldErrors).length > 0}
            className="w-full bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "በመግባት ላይ..." : "ግባ"}
          </button>
        </form>

        <p className="text-center text-sm text-[#0D3B4A] mt-6">
          መለያ የለዎትም?{" "}
          <Link
            href="/auth/register"
            className="text-[#FF1744] hover:underline font-medium"
          >
            ይመዝገቡ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-gray-500">በመጫን ላይ...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
