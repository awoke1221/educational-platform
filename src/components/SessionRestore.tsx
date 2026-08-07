"use client";

import { useEffect } from "react";
import {
  clearAuthTokens,
  getStoredAccessToken,
  getStoredExpiresAt,
  getStoredRefreshToken,
  isTokenExpired,
  refreshAccessToken,
} from "@/lib/utils/auth-fetch";

export default function SessionRestore() {
  useEffect(() => {
    async function restoreSession() {
      const accessToken = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();
      const expiresAt = getStoredExpiresAt();

      if (!refreshToken) {
        return;
      }

      if (!accessToken || isTokenExpired()) {
        const newToken = await refreshAccessToken();

        if (newToken) {
          window.dispatchEvent(new Event("auth-changed"));
        } else {
          clearAuthTokens();
          window.dispatchEvent(new Event("auth-changed"));
        }
      }

      // If the access token is still valid, the stored user is already enough
      // for the Navbar to show the logged-in state.
    }

    restoreSession();
  }, []);

  return null;
}
