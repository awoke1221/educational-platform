export function getAppBaseUrl() {
  // 1. On the client side, always use the actual browser origin.
  //    This ensures the correct domain is used whether the user is on
  //    localhost, the custom domain (adonaytiktokacademy.com), or Vercel.
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  // 2. On the server side (SSR / API routes), fall back to the
  //    configured env var, otherwise default to localhost.
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function getGoogleCallbackUrl() {
  return `${getAppBaseUrl()}/auth/google/callback`;
}
