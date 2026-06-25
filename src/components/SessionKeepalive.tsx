// src/components/SessionKeepalive.tsx
// Client component that runs the proactive session keepalive timer.
// Renders nothing — only the side effect matters.

"use client";

import { useSessionKeepalive } from "@/lib/hooks/useSessionKeepalive";

export default function SessionKeepalive() {
  useSessionKeepalive();
  return null;
}
