"use client";

import { useEffect, useState } from "react";

const CACHE_KEY = "vocab-translations-v1";

function loadCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — drop silently, lookups still work per-request
  }
}

/**
 * Given a list of EN terms, returns a map term→PT-BR, fetching missing ones
 * from /api/translate (DeepL proxy) and caching in localStorage so repeat
 * visits don't burn the free-tier quota.
 *
 * Terms with an empty string result (DeepL miss) are NOT cached so they can
 * be retried on the next mount.
 */
export function useVocabTranslations(terms: string[]) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (terms.length === 0) return;
    const cache = loadCache();
    const cached: Record<string, string> = {};
    const missing: string[] = [];
    for (const t of terms) {
      const key = t.toLowerCase();
      if (cache[key]) cached[t] = cache[key];
      else missing.push(t);
    }
    setMap(cached);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms: missing }),
        });
        if (!res.ok) return;
        const { translations } = (await res.json()) as {
          translations: Record<string, string>;
        };
        if (cancelled) return;
        const next = { ...cached };
        const nextCache = { ...cache };
        for (const [term, pt] of Object.entries(translations)) {
          if (pt && pt.length > 0) {
            next[term] = pt;
            nextCache[term.toLowerCase()] = pt;
          }
        }
        setMap(next);
        saveCache(nextCache);
      } catch {
        // network error — ignore; chips just stay untranslated this session
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [terms.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}
