import { NextResponse } from "next/server";

/**
 * Audio transcription + pronunciation scoring via Groq Whisper.
 *
 * POST /api/pronunciation
 *   multipart/form-data:
 *     audio:  the recorded Blob/File (webm / wav / mp3)
 *     target: the target English phrase (string)
 *
 * Returns: { transcription, target, score (0–100), feedback }
 *
 * We use whisper-large-v3 on Groq (free). The score is a simple
 * Levenshtein-based similarity on normalized text — forgiving but
 * strict enough to tell a good attempt from a bad one.
 */
export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const target = String(form.get("target") ?? "").trim();
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }
  if (!target) {
    return NextResponse.json({ error: "Missing target phrase" }, { status: 400 });
  }

  const groqForm = new FormData();
  groqForm.append("file", audio, "recording.webm");
  groqForm.append("model", "whisper-large-v3");
  groqForm.append("language", "en");
  groqForm.append("response_format", "json");
  groqForm.append("temperature", "0");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: groqForm,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Groq ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }
  const json = (await res.json()) as { text?: string };
  const transcription = (json.text ?? "").trim();

  const score = similarityScore(transcription, target);
  const feedback = buildFeedback(score, transcription, target);

  return NextResponse.json({ transcription, target, score, feedback });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarityScore(got: string, want: string): number {
  const a = normalize(got);
  const b = normalize(want);
  if (a.length === 0) return 0;
  const dist = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 100;
  const raw = 1 - dist / longest;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function buildFeedback(
  score: number,
  got: string,
  want: string
): string {
  if (score >= 90) return "Excellent! Very close to the target.";
  if (score >= 70)
    return `Good attempt. We heard: "${got}". Target: "${want}".`;
  if (score >= 40)
    return `Getting there. We heard: "${got}". Try again focusing on the stressed words.`;
  return `That didn't match. We heard: "${got}". Target: "${want}". Speak slowly and clearly.`;
}
