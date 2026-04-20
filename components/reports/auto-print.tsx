"use client";

import { useEffect } from "react";

/**
 * Trigger the browser's native print dialog once the page has had a
 * chance to paint + load images. Reports pass `autoprint=1` in the
 * URL to get one-click "click button → PDF in Downloads" behaviour;
 * skip the param to just preview the report on-screen.
 *
 * We wait a tick past `window.onload` so charts (Recharts renders via
 * ResizeObserver) have time to settle before the print dialog freezes
 * the layout.
 */
export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      // ~600 ms lets Recharts + web fonts settle on most machines
      // without feeling laggy.
      setTimeout(() => window.print(), 600);
    }
    if (document.readyState === "complete") {
      fire();
    } else {
      window.addEventListener("load", fire, { once: true });
    }
    return () => window.removeEventListener("load", fire);
  }, [enabled]);
  return null;
}
