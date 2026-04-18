import { NextResponse } from "next/server";
import { OWNER_EMAIL } from "@/lib/auth/roles";

/**
 * Free EN→PT-BR translation proxy backed by MyMemory.
 *
 *   https://mymemory.translated.net/doc/spec.php
 *
 * No API key, no credit card. Anonymous quota is 5k chars/day per IP;
 * passing a valid email (`de=`) bumps it to 50k chars/day. At ~5 chars
 * per word that's ~10k lookups/day server-wide, plenty for vocab chips.
 * The client hook caches results in localStorage so quota lasts longer.
 *
 * MyMemory takes one term per request; we fetch the batch in parallel
 * with a small concurrency cap to avoid throttling.
 */

const BATCH_CONCURRENCY = 6;
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

async function translateOne(term: string): Promise<string | null> {
  const params = new URLSearchParams({
    q: term,
    langpair: "en|pt-BR",
    de: OWNER_EMAIL,
  });
  try {
    const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
    };
    const status = Number(json.responseStatus);
    if (status !== 200) return null;
    const raw = json.responseData?.translatedText?.trim() ?? "";
    if (!raw) return null;
    // MyMemory sometimes echoes the source on unknown words. Filter that.
    if (raw.toLowerCase() === term.toLowerCase()) return null;
    return raw;
  } catch {
    return null;
  }
}

async function runLimited<T, R>(
  items: T[],
  concurrency: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const terms = Array.isArray(body?.terms)
    ? (body.terms as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.length > 0
      )
    : [];
  if (terms.length === 0) {
    return NextResponse.json({ translations: {} });
  }

  const results = await runLimited(terms, BATCH_CONCURRENCY, translateOne);
  const out: Record<string, string> = {};
  terms.forEach((t, i) => {
    const pt = results[i];
    if (pt) out[t] = pt;
  });
  return NextResponse.json({ translations: out });
}
