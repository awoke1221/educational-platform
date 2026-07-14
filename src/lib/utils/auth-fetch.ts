import { API_ENDPOINTS } from "@/lib/constants";

// ── localStorage keys ─────────────────────────────────────────────
const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const EXPIRES_AT_KEY = "tokenExpiresAt";

// Refresh the token when fewer than this many seconds remain.
const PROACTIVE_REFRESH_BUFFER_SEC = 300; // 5 minutes

// ── Accessors ─────────────────────────────────────────────────────

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** Get the stored token expiry timestamp (Unix seconds). */
export function getStoredExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(EXPIRES_AT_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

/** Store (or clear) the token expiry timestamp. */
export function setStoredExpiresAt(expiresAt: number | null | undefined) {
  if (typeof window === "undefined") return;
  if (expiresAt != null && Number.isFinite(expiresAt)) {
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  } else {
    localStorage.removeItem(EXPIRES_AT_KEY);
  }
}

/** Remove all auth tokens from storage (logout). */
export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem("user");
}

/**
 * Check whether the stored access token is expired or about to expire
 * (within the proactive buffer window).
 */
export function isTokenExpired(): boolean {
  const expiresAt = getStoredExpiresAt();
  if (expiresAt == null) {
    // No expiry stored — assume valid (will get 401 later if not).
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - PROACTIVE_REFRESH_BUFFER_SEC;
}

// ── Token refresh ─────────────────────────────────────────────────

let refreshInProgress: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls so only one request fires.
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = _doRefresh();
  try {
    return await refreshInProgress;
  } finally {
    refreshInProgress = null;
  }
}

async function _doRefresh(): Promise<string | null> {
  try {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      return null;
    }

    const refreshResponse = await fetch(API_ENDPOINTS.REFRESH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      clearAuthTokens();
      return null;
    }

    const data = await refreshResponse.json();
    if (data?.accessToken) {
      setStoredAccessToken(data.accessToken);
      // Update refresh token (rotation may have issued a new one)
      if (data.refreshToken) {
        setStoredRefreshToken(data.refreshToken);
      }
      // Store new expiry
      if (data.expiresAt != null) {
        setStoredExpiresAt(data.expiresAt);
      }
      return data.accessToken;
    }

    clearAuthTokens();
    return null;
  } catch (error) {
    console.error("[AUTH FETCH] Failed to refresh access token", error);
    clearAuthTokens();
    return null;
  }
}

// ── Proactive refresh on each API call ────────────────────────────

/**
 * Before making an API call, ensure the access token is still fresh.
 * If it's expired or about to expire, refresh it first.
 */
async function ensureFreshToken(): Promise<string | null> {
  const token = getStoredAccessToken();
  if (!token) return null;

  if (isTokenExpired()) {
    const newToken = await refreshAccessToken();
    return newToken;
  }

  return token;
}

// ── Authenticated fetch ───────────────────────────────────────────

export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  // Proactively refresh before making the request if needed.
  const token = await ensureFreshToken();
  const isFormData = init.body instanceof FormData;

  // For FormData (file uploads), don't override headers — let the browser
  // auto-set Content-Type: multipart/form-data; boundary=... which is required
  // for the server to parse the upload correctly.
  let headers: Headers;
  if (isFormData) {
    headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } else {
    headers = new Headers(init.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  // Reactive fallback: if the server rejects the token, try refreshing once.
  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      return fetch(input, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }

  return response;
}

export async function authFetchJson<T = any>(
  input: RequestInfo,
  init: RequestInit = {},
  retry = true,
): Promise<{ response: Response; data: T }> {
  const response = await authFetch(input, init, retry);
  const text = await response.text();
  let data: T = {} as T;

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { error: text } as T;
    }
  }

  return { response, data };
}
