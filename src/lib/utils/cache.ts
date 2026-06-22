// Lightweight client-side cache with TTL
// Prevents redundant API calls on page navigation

import { authFetchJson } from "@/lib/utils/auth-fetch";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const memoryStore = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 30_000; // 30 seconds

export function getCached<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  memoryStore.set(key, { data, expiry: Date.now() + ttl });
}

export function clearCache(key?: string): void {
  if (key) {
    memoryStore.delete(key);
  } else {
    memoryStore.clear();
  }
}

// Fetch wrapper with cache — for unauthenticated GET requests
export async function cachedFetch<T = any>(
  url: string,
  options?: RequestInit,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const cacheKey = `${options?.method || "GET"}:${url}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const response = await fetch(url, options);
  const data = await response.json();

  // Only cache GET requests
  if (!options?.method || options.method === "GET") {
    setCache(cacheKey, data, ttl);
  }

  return data as T;
}

// Wrapper for authFetchJson with caching — for authenticated GET requests
// Call this instead of authFetchJson to avoid redundant API calls on re-navigation
export async function cachedAuthFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  ttl = DEFAULT_TTL,
): Promise<{ response: Response; data: T }> {
  const cacheKey = `auth:${options?.method || "GET"}:${url}`;
  const cached = getCached<{ response: Response; data: T }>(cacheKey);
  if (cached) return cached;

  const result = await authFetchJson(url, options);
  const isGet = !options?.method || options.method === "GET";
  if (isGet && result.response.ok) {
    setCache(cacheKey, result, ttl);
  }
  return result;
}
