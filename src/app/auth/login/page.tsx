"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { authFetchJson } from "@/lib/utils/auth-fetch";

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
        // Store tokens and user info
        localStorage.setItem("token", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-surface to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border-t-4 border-primary">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center mb-2">
          ግባ
        </h1>
        <p className="text-primary text-center text-sm mb-6 font-medium">
          {showEmailForm ? "በኢሜል ይግቡ" : "Google በመጠቀም ይግቡ"}
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

        {showEmailForm ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? "በመግባት ላይ..." : "ግባ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmailForm(false);
                setError("");
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-primary transition-colors"
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
              className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-[#E0E0E0] bg-white py-3 text-sm font-semibold text-[#1F2937] shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white p-1">
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
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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
              Sign in with Email
            </button>
          </>
        )}

        <p className="text-center text-sm text-primary mt-6">
          መለያ የለዎትም?{" "}
          <Link
            href="/auth/register"
            className="text-secondary hover:underline font-medium"
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
