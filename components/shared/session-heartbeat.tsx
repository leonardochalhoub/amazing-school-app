"use client";

import { useEffect } from "react";

const FLUSH_INTERVAL_MS = 30_000;
const MIN_SECONDS = 1;
const MAX_SECONDS = 300;

/**
 * Mount this anywhere inside an authenticated layout. It measures
 * focused-tab time using the Page Visibility API and posts the
 * elapsed seconds to /api/heartbeat every ~30s plus once on page
 * hide (so closing the tab doesn't lose the trailing chunk). Tab
 * switches pause the timer; switching back resumes it.
 *
 * Renders nothing. Lives as a separate client component so the
 * surrounding layout can stay a server component.
 */
export function SessionHeartbeat() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    let focused = !document.hidden;
    let accumulatedMs = 0;
    let lastTick = Date.now();

    function absorb() {
      const now = Date.now();
      if (focused) accumulatedMs += now - lastTick;
      lastTick = now;
    }

    async function flush(useBeacon = false) {
      absorb();
      const seconds = Math.floor(accumulatedMs / 1000);
      if (seconds < MIN_SECONDS) return;
      // Reset the accumulator optimistically. Worst case we lose a
      // ping on the server side; far better than double-counting.
      accumulatedMs -= seconds * 1000;
      const cap = Math.min(seconds, MAX_SECONDS);
      const body = JSON.stringify({ seconds: cap });
      try {
        if (useBeacon && "sendBeacon" in navigator) {
          // sendBeacon is fire-and-forget and survives pagehide on
          // mobile safari where fetch+keepalive sometimes doesn't.
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/heartbeat", blob);
        } else {
          await fetch("/api/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
        }
      } catch {
        // Network blips are fine — the accumulator already reset;
        // next ping will carry fresh time.
      }
    }

    function onVisibilityChange() {
      absorb();
      focused = !document.hidden;
      lastTick = Date.now();
    }

    function onPageHide() {
      flush(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    const interval = setInterval(() => flush(false), FLUSH_INTERVAL_MS);

    return () => {
      flush(true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
    };
  }, []);

  return null;
}
