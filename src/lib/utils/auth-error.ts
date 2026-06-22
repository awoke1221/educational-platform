// src/lib/utils/auth-error.ts
// Shared utility for handling authentication errors on admin pages

import { setStoredAccessToken, setStoredRefreshToken } from "./auth-fetch";

/**
 * Handle a 401/403 API response by clearing auth state and redirecting to login.
 * @param status - HTTP status code
 * @param router - Optional Next.js router (from useRouter()). If not provided, falls back to window.location.href
 */
export function handleAuthError(
  status: number,
  router?: { push: (url: string) => void },
): void {
  if (status === 401 || status === 403) {
    // Clear stored tokens
    setStoredAccessToken(null);
    setStoredRefreshToken(null);
    localStorage.removeItem("user");

    // Redirect to login with redirect back
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;

    if (router) {
      router.push(loginUrl);
    } else {
      window.location.href = loginUrl;
    }
  }
}
