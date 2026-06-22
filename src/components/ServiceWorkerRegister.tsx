"use client";

// ============================================
// 📡 Service Worker Registration Component
// ============================================
// Registers the video caching service worker.
// Must be a client component because `navigator` is browser-only.
// ============================================

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol === "https:"
    ) {
      // Register with a small delay so it doesn't compete with initial page load
      const timer = setTimeout(async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("[SW] Service worker registered:", registration.scope);
        } catch (err) {
          console.warn("[SW] Service worker registration failed:", err);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  // This component doesn't render anything visible
  return null;
}
