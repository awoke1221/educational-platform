export function getAppBaseUrl() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    const isLocalOrigin =
      currentOrigin.includes("localhost") ||
      currentOrigin.includes("127.0.0.1");

    if (isLocalOrigin) {
      return currentOrigin;
    }
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function getGoogleCallbackUrl() {
  return `${getAppBaseUrl()}/auth/google/callback`;
}
