import { API_ENDPOINTS } from "@/lib/constants";

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

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

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = getStoredRefreshToken();
    const refreshResponse = await fetch(API_ENDPOINTS.REFRESH, {
      method: "POST",
      headers: {
        "Content-Type": refreshToken ? "application/json" : "text/plain",
      },
      credentials: "include",
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });

    if (!refreshResponse.ok) {
      setStoredAccessToken(null);
      return null;
    }

    const data = await refreshResponse.json();
    if (data?.accessToken) {
      setStoredAccessToken(data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error("[AUTH FETCH] Failed to refresh access token", error);
    setStoredAccessToken(null);
    return null;
  }
}

export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = getStoredAccessToken();
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
    // Don't set Content-Type or Accept — browser handles Content-Type for FormData
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
  const data = await response.json().catch(() => ({}) as T);
  return { response, data };
}
