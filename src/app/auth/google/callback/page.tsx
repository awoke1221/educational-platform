"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { normalizeInput } from "@/lib/validators/form-validation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState("/dashboard");
  const [status, setStatus] = useState("Signing in with Google...");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function signInWithGoogle(payload: {
    email: string;
    fullName?: string;
    profileImage?: string;
    phoneNumber?: string;
    providerUserId?: string | null;
    providerIdentityId?: string | null;
  }) {
    setError(null);
    setStatus("Completing sign-in...");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          fullName: payload.fullName,
          phoneNumber: payload.phoneNumber,
          profileImage: payload.profileImage,
          providerUserId: payload.providerUserId,
          providerIdentityId: payload.providerIdentityId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google sign-in failed.");
        setLoading(false);
        return;
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem("token", data.tokens.accessToken);
      }
      if (data.tokens?.refreshToken) {
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      router.push(redirectTo);
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  useEffect(() => {
    async function handleGoogleCallback() {
      if (!supabase) {
        setError(
          "Google auth is not configured. Please check environment settings.",
        );
        setLoading(false);
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Get the redirect target from sessionStorage (set by login/register page)
        const storedRedirect = sessionStorage.getItem("oauth_redirect_target");
        if (storedRedirect) {
          setRedirectTo(storedRedirect);
          sessionStorage.removeItem("oauth_redirect_target");
        }

        // Wait for the Supabase client to auto-exchange the code (it handles
        // this automatically on initialization when it detects ?code= in the URL).
        // Then grab the session.
        const MAX_WAIT = 10000; // 10 seconds
        const pollInterval = 200; // check every 200ms
        let waited = 0;
        let session: any = null;

        while (waited < MAX_WAIT) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            setError(error.message || "Unable to complete Google sign-in.");
            setLoading(false);
            return;
          }
          if (data?.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, pollInterval));
          waited += pollInterval;
        }

        if (!session) {
          // The auto-exchange didn't work — try exchanging the code manually
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError || !exchangeData?.session) {
              setError(
                exchangeError?.message || "Unable to complete Google sign-in.",
              );
              setLoading(false);
              return;
            }
            session = exchangeData.session;
          } else {
            setError("Google sign-in code not found in the callback URL.");
            setLoading(false);
            return;
          }
        }

        const user = session.user;
        const email = user.email;
        if (!email) {
          setError("Google did not provide an email address.");
          setLoading(false);
          return;
        }

        const metadata = (user.user_metadata || {}) as Record<string, string>;
        const fullName =
          metadata.full_name || metadata.name || metadata.given_name || "";
        const profileImage = metadata.avatar_url || metadata.picture || "";
        const userPhone =
          (user as { phone?: string }).phone || metadata.phone || "";
        const identities = (user as any).identities as Array<any> | undefined;
        const mainIdentity = identities?.[0];
        const providerUserId =
          mainIdentity?.identity_id || mainIdentity?.id || null;
        const providerIdentityId =
          mainIdentity?.id || mainIdentity?.identity_id || null;
        const payload = {
          email: email.toLowerCase().trim(),
          fullName: normalizeInput(fullName || email.split("@")[0]),
          profileImage: profileImage || undefined,
          phoneNumber: userPhone.trim() || undefined,
          providerUserId,
          providerIdentityId,
        };

        // Proceed immediately — phone is optional for Google OAuth.
        // If Google provided one, great; otherwise we continue without it
        // and the user can add it later from their profile.
        await signInWithGoogle(payload);
      } catch (err) {
        console.error("Google callback error:", err);
        setError("Unable to complete Google sign-in. Please try again.");
        setLoading(false);
      }
    }

    handleGoogleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-surface to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border-t-4 border-[#4285F4]">
        <h1 className="text-2xl font-bold text-center mb-2">Google sign-in</h1>
        <p className="text-center text-sm text-primary mb-6">
          Complete your login using Google.
        </p>

        <div className="bg-slate-50 p-4 rounded-xl mb-4 text-sm text-slate-700">
          {status}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {error}
          </div>
        )}

        <div className="text-center text-sm text-slate-600">
          {loading && !error
            ? "Finishing authentication, please wait..."
            : null}
        </div>
      </div>
    </div>
  );
}
