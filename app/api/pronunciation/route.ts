import { NextResponse } from "next/server";

/**
 * Audio transcription + pronunciation scoring via Groq Whisper.
 *
 * POST /api/pronunciation
 *   multipart/form-data:
 *     audio:  the recorded Blob/File (webm / wav / mp3)
 *     target: the target English phrase (string)
 *
 * Returns: { transcription, target, score (0–100), feedback,
 *            similarity, confidence, clarity, raw }
 *
 * Scoring is intentionally stricter than raw text similarity because
 * Whisper auto-cleans bad pronunciation — "hau ar iu" transcribes to
 * "how are you" and would otherwise get 100. We now:
 *   1. Request verbose_json so we get per-segment `avg_logprob` +
 *      `no_speech_prob` and use them as a CLARITY signal.
 *   2. Apply a steep exponential curve to text similarity so near-
 *      perfect is required for 90+.
 *   3. Multiply similarity × clarity so a muffled / uncertain recording
 *      can't score 100 even if Whisper's best guess matches the target.
 *
 * Tune all three dials with env vars:
 *   PRONUNCIATION_STRICTNESS     (default 2.5) — similarity exponent
 *   PRONUNCIATION_CLARITY_WEIGHT (default 0.55) — how much clarity
 *                                  matters (0 = disabled, 1 = all)
 *   PRONUNCIATION_CEILING        (default 98) — hard max on any score
 */
const STRICTNESS = clampNum(
  Number(process.env.PRONUNCIATION_STRICTNESS),
  0.5,
  6,
  2.5,
);
const CLARITY_WEIGHT = clampNum(
  Number(process.env.PRONUNCIATION_CLARITY_WEIGHT),
  0,
  1,
  0.55,
);
const SCORE_CEILING = clampNum(
  Number(process.env.PRONUNCIATION_CEILING),
  50,
  100,
  98,
);

function clampNum(v: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

interface WhisperSegment {
  avg_logprob?: number;
  no_speech_prob?: number;
  compression_ratio?: number;
}

interface WhisperVerboseResponse {
  text?: string;
  segments?: WhisperSegment[];
}

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
  // verbose_json gives us the per-segment log-probabilities we use to
  // infer how clearly the speaker pronounced the phrase.
  groqForm.append("response_format", "verbose_json");
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
  const json = (await res.json()) as WhisperVerboseResponse;
  const transcription = (json.text ?? "").trim();

  const similarity = similarityScore(transcription, target); // 0–100
  const clarity = clarityScore(json.segments); // 0–100
  const score = combineScore(similarity, clarity);
  const feedback = buildFeedback(score, transcription, target, clarity);

  return NextResponse.json({
    transcription,
    target,
    score,
    feedback,
    similarity,
    clarity,
    raw: { strictness: STRICTNESS, clarityWeight: CLARITY_WEIGHT, ceiling: SCORE_CEILING },
  });
}

/**
 * Turn Whisper's per-segment stats into a 0–100 "clarity" score.
 *
 * avg_logprob is a negative number, closer to 0 = more confident.
 * -0.1 is excellent, -0.3 is solid, -0.6+ means the model was guessing.
 * no_speech_prob near 1 means Whisper thinks the audio is silence/noise.
 */
function clarityScore(segments: WhisperSegment[] | undefined): number {
  if (!segments || segments.length === 0) return 60; // unknown → middling
  let logprobSum = 0;
  let noSpeechSum = 0;
  let n = 0;
  for (const s of segments) {
    if (typeof s.avg_logprob === "number") logprobSum += s.avg_logprob;
    if (typeof s.no_speech_prob === "number") noSpeechSum += s.no_speech_prob;
    n += 1;
  }
  if (n === 0) return 60;
  const avgLogprob = logprobSum / n;
  const avgNoSpeech = noSpeechSum / n;

  // Map avg_logprob from [-1.5, -0.05] → [0, 1] then square.
  const lp = Math.max(0, Math.min(1, (avgLogprob + 1.5) / 1.45));
  const logprobScore = Math.pow(lp, 1.4) * 100;

  // no_speech_prob directly penalizes: 0 = perfect, 0.5 = -50pts.
  const penalty = Math.min(60, Math.round(avgNoSpeech * 100));
  return Math.max(0, Math.min(100, Math.round(logprobScore - penalty)));
}

function combineScore(similarity: number, clarity: number): number {
  // Steep curve on similarity so 80% text match ≈ 57, 90% ≈ 77, 95% ≈ 88.
  const shaped = Math.pow(similarity / 100, STRICTNESS) * 100;
  // Blend with clarity — a clean recording reading the target nets high;
  // a muffled recording that happens to transcribe to the right text
  // still gets docked.
  const blended = shaped * (1 - CLARITY_WEIGHT) + (shaped * clarity) / 100 * CLARITY_WEIGHT;
  return Math.max(0, Math.min(SCORE_CEILING, Math.round(blended)));
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
  want: string,
  clarity: number,
): string {
  const clarityNote =
    clarity < 55
      ? ' Your recording was a bit unclear — try again in a quieter spot, closer to the mic.'
      : "";
  if (score >= 90) return `Excellent! Very close to the target.${clarityNote}`;
  if (score >= 70)
    return `Good attempt. We heard: "${got}". Target: "${want}".${clarityNote}`;
  if (score >= 40)
    return `Getting there. We heard: "${got}". Focus on the stressed words and try again.${clarityNote}`;
  return `That didn't match. We heard: "${got}". Target: "${want}". Speak slowly and clearly.${clarityNote}`;
}
