"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/db/supabase";

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-surface to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border-t-4 border-secondary">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center mb-2">
          ይመዝገቡ
        </h1>
        <p className="text-primary text-center text-sm mb-6 font-medium">
          Google በመጠቀም ይመዝገቡ
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {error}
          </div>
        )}

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
