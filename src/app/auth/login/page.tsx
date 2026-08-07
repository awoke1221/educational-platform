"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { authFetchJson } from "@/lib/utils/auth-fetch";
import { getGoogleCallbackUrl } from "@/lib/utils/app-url";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

    const redirectUrl = getGoogleCallbackUrl();

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { response, data } = await authFetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok && data.success) {
        // Store tokens, expiry, and user info
        localStorage.setItem("token", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
        localStorage.setItem("tokenExpiresAt", String(data.tokens.expiresAt));
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-changed"));
        router.push(redirectTo);
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-[#0a0604]">
      <div className="w-full max-w-md rounded-[24px] border border-[#a30000]/15 bg-[#0f0b09]/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm">
        <h1 className="mb-2 text-center text-2xl font-bold bg-gradient-to-r from-[#ef4444] via-[#c9952a] to-[#f5c96b] bg-clip-text text-transparent">
          ግባ
        </h1>
        <p className="mb-6 text-center text-sm font-medium text-[#f5e7c4]/85">
          {showEmailForm ? "በኢሜል ይግቡ" : "Google በመጠቀም ይግቡ"}
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#fda4af] bg-[#fff1f2] p-3 text-sm text-[#b91c1c]">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0"
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

        {showEmailForm ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#f5c96b]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-[#c9952a]/40 bg-[#140d0b] px-3 py-2.5 text-sm text-[#fff8eb] placeholder:text-[#8a7a5e] outline-none transition focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/25"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#f5c96b]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-[#c9952a]/40 bg-[#140d0b] px-3 py-2.5 text-sm text-[#fff8eb] placeholder:text-[#8a7a5e] outline-none transition focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/25"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#ef4444] via-[#a30000] to-[#c9952a] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ef4444]/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[#c9952a]/30 disabled:opacity-50"
            >
              {loading ? "በመግባት ላይ..." : "ግባ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmailForm(false);
                setError("");
              }}
              className="w-full text-center text-sm text-[#f5c96b]/80 transition-colors hover:text-[#ef4444]"
            >
              ← Back to Google sign in
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-[#c9952a]/30 bg-[#1a120f] py-3 text-sm font-semibold text-[#fff7eb] shadow-sm transition hover:bg-[#231714] disabled:opacity-50"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/90 p-1 shadow-sm">
                <Image
                  src="/google-logo.svg"
                  alt="Google"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </span>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#c9952a]/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0f0b09] px-3 text-[#f5c96b]/70">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9952a]/30 bg-[#1a120f] py-2.5 text-sm font-medium text-[#fff8eb] transition hover:bg-[#231714]"
            >
              <svg
                className="h-4 w-4"
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
              Sign in with Email
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-[#f5e7c4]/85">
          መለያ የለዎትም?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-[#f5c96b] hover:text-[#ef4444] hover:underline"
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
