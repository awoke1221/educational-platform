// src/lib/hooks/useSessionKeepalive.ts
// Proactive session keepalive — refreshes the access token in the
// background before it expires so the user never gets logged out
// during normal usage.
//
// Usage:  call useSessionKeepalive() once at the app root or in the
// layout so it runs as long as the user is on the page.

"use client";

import { useEffect, useRef } from "react";
import { getStoredExpiresAt, refreshAccessToken } from "@/lib/utils/auth-fetch";

/**
 * Interval (ms) at which we check token freshness.
 * Checks every 2 minutes so we catch expiry well before the 5-minute
 * proactive buffer window in auth-fetch.ts.
 */
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * How many seconds before expiry we should refresh.
 * Must be >= the PROACTIVE_REFRESH_BUFFER_SEC in auth-fetch.ts.
 */
const REFRESH_BEFORE_SEC = 5 * 60; // 5 minutes

/**
 * Start a single background interval that keeps the user's session
 * alive by refreshing the access token before it expires.
 *
 * The interval auto-cleans up when the component unmounts.
 */
export function useSessionKeepalive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any previous interval (safety for strict mode)
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Immediately check once on mount
    checkAndRefresh();

    // Then check every CHECK_INTERVAL_MS
    intervalRef.current = setInterval(checkAndRefresh, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

async function checkAndRefresh() {
  const expiresAt = getStoredExpiresAt();
  if (expiresAt == null) return; // No token stored

  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;

  // If the token expires within the buffer window, refresh it.
  if (remaining < REFRESH_BEFORE_SEC) {
    console.debug(
      `[SessionKeepalive] Token expires in ${remaining}s — refreshing now`,
    );
    const newToken = await refreshAccessToken();
    if (newToken) {
      console.debug("[SessionKeepalive] Token refreshed successfully");
    } else {
      console.warn(
        "[SessionKeepalive] Token refresh failed — user may be logged out soon",
      );
    }
  }
}
