"use client";
import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import ComingSoonForm from "@/components/ComingSoonForm";

const LAUNCH_DATE =
  process.env.NEXT_PUBLIC_COURSE_LAUNCH_DATE || "2026-07-26T00:00:00";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [comingSoon, setComingSoon] = useState(true);

  useEffect(() => {
    const launch = LAUNCH_DATE;
    if (launch) {
      setComingSoon(new Date(launch).getTime() > Date.now());
    } else {
      setComingSoon(false);
    }
  }, []);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    if (!supabase) {
      setError("Google auth is not configured.");
      setLoading(false);
      return;
    }

    // Store the redirect target in sessionStorage for the callback page to use
    sessionStorage.setItem("oauth_redirect_target", redirectTo);

    const redirectUrl = `${window.location.origin}/auth/google/callback`;

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (googleError) {
      setError(googleError.message);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await authFetchJson("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phoneNumber: form.phoneNumber.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      if (response.ok && data.success) {
        alert(data.message || "Registration successful! You can now login.");
        router.push("/auth/login");
      } else {
        const errMsg = data.errors
          ? Object.values(data.errors).flat().join(", ")
          : data.error || "Registration failed";
        setError(errMsg);
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-[#0a0604]">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-8 border-t-4 border-secondary">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center mb-2">
          ይመዝገቡ
        </h1>
        <p className="text-primary text-center text-sm mb-6 font-medium">
          {showEmailForm ? "በኢሜል ይመዝገቡ" : "Google በመጠቀም ይመዝገቡ"}
        </p>

        {/* Coming Soon Banner */}
        <div className="mb-5 p-4 rounded-xl bg-black/40 border border-[#ef4444]/20 shadow-lg shadow-[#ef4444]/5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            <span className="text-xs font-semibold text-[#ef4444]/90">
              🚀 Adony TikTok Academy — በቅርቡ ይጀምራል!
            </span>
          </div>
          <div className="mt-3">
            <ComingSoonForm source="register" launchDate={LAUNCH_DATE} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {error}
          </div>
        )}

        {showEmailForm ? (
          <form onSubmit={handleEmailRegister} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                name="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="+251911111111"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || comingSoon}
              className="w-full bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-[#a30000]/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "በመመዝገብ ላይ..." : comingSoon ? "በቅርቡ ይጀምራል" : "ይመዝገቡ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmailForm(false);
                setError("");
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-primary transition-colors"
            >
              ← Back to Google sign up
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={loading || comingSoon}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white/80 shadow-sm hover:bg-white/10 transition disabled:opacity-50 backdrop-blur-md"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10 p-1">
                <Image
                  src="/google-logo.svg"
                  alt="Google"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </span>
              {comingSoon ? "🚀 በቅርቡ ይጀምራል" : "Continue with Google"}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface px-3 text-white/40">or</span>
              </div>
            </div>

            <button
              type="button"
              disabled={comingSoon}
              onClick={() => {
                if (!comingSoon) setShowEmailForm(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 border border-white/20 rounded-lg py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {comingSoon ? "🚀 በቅርቡ ይጀምራል" : "Sign up with Email"}
            </button>
          </>
        )}

        <p className="text-center text-sm text-primary mt-6">
          መለያ አለዎት?{" "}
          <Link
            href="/auth/login"
            className="text-secondary hover:underline font-medium"
          >
            ይግቡ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-gray-500">በመጫን ላይ...</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
