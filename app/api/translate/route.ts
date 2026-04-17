import { NextResponse } from "next/server";

/**
 * DeepL Free translation proxy. Keeps the key server-side.
 *
 * Client posts { terms: string[] } in English; we call DeepL EN→PT-BR and
 * return { translations: Record<term, pt> }. Batched — DeepL accepts up to
 * 50 `text` params per request and the free tier caps at 500k chars/month.
 *
 * The DeepL endpoint differs by plan — free-tier keys end in ":fx" and must
 * use api-free.deepl.com, while pro keys use api.deepl.com. We branch on
 * the key suffix so either works transparently.
 */
export async function POST(req: Request) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DEEPL_API_KEY not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const terms = Array.isArray(body?.terms)
    ? (body.terms as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.length > 0
      )
    : [];
  if (terms.length === 0) {
    return NextResponse.json({ translations: {} });
  }

  const host = key.trim().endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
  const form = new URLSearchParams();
  form.set("target_lang", "PT-BR");
  form.set("source_lang", "EN");
  for (const t of terms) form.append("text", t);

  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `DeepL ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }
  const json = (await res.json()) as {
    translations?: { text: string }[];
  };
  const out: Record<string, string> = {};
  (json.translations ?? []).forEach((t, i) => {
    if (terms[i] !== undefined) out[terms[i]] = t.text;
  });
  return NextResponse.json({ translations: out });
}
