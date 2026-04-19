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
  3.5,
);
const CLARITY_WEIGHT = clampNum(
  Number(process.env.PRONUNCIATION_CLARITY_WEIGHT),
  0,
  1,
  0.6,
);
const SCORE_CEILING = clampNum(
  Number(process.env.PRONUNCIATION_CEILING),
  50,
  100,
  95,
);
// Per-word mistake penalty. Each missed/substituted target word shaves
// this many points off the final score so "I have apple" vs
// "I had apple" lands around 75 instead of 92.
const WORD_MISTAKE_PENALTY = clampNum(
  Number(process.env.PRONUNCIATION_WORD_PENALTY),
  0,
  40,
  12,
);
// Require every target word to match before the score can hit 100.
// When false, a high similarity average + great clarity is enough.
const PERFECT_REQUIRES_ALL_WORDS =
  (process.env.PRONUNCIATION_PERFECT_REQUIRES_ALL_WORDS ?? "true") !== "false";

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
  const diff = wordDiff(transcription, target);
  const score = combineScore(similarity, clarity, diff);
  const feedback = buildFeedback(score, transcription, target, clarity, diff);

  return NextResponse.json({
    transcription,
    target,
    score,
    feedback,
    similarity,
    clarity,
    diff,
    raw: {
      strictness: STRICTNESS,
      clarityWeight: CLARITY_WEIGHT,
      ceiling: SCORE_CEILING,
      wordPenalty: WORD_MISTAKE_PENALTY,
    },
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

function combineScore(
  similarity: number,
  clarity: number,
  diff: WordDiff,
): number {
  // Steep curve on similarity so 80% text match ≈ 41, 90% ≈ 69,
  // 95% ≈ 84 (at strictness=3.5).
  const shaped = Math.pow(similarity / 100, STRICTNESS) * 100;
  // Blend with clarity — a clean recording reading the target nets high;
  // a muffled recording that happens to transcribe to the right text
  // still gets docked.
  const blended =
    shaped * (1 - CLARITY_WEIGHT) +
    (shaped * clarity) / 100 * CLARITY_WEIGHT;
  // Per-word penalty — each wrong / missed target word shaves a fixed
  // amount so the user can't "average out" a fluff-filled recording.
  const mistakes = diff.words.filter((w) => w.status !== "ok").length;
  const penalized = blended - mistakes * WORD_MISTAKE_PENALTY;
  // Only award 100 when every target word matched AND the raw numbers
  // say so. Otherwise cap at the ceiling (95 by default).
  const hasAllWords = mistakes === 0;
  const ceiling =
    PERFECT_REQUIRES_ALL_WORDS && !hasAllWords ? SCORE_CEILING - 2 : SCORE_CEILING;
  return Math.max(0, Math.min(ceiling, Math.round(penalized)));
}

// ---------------------------------------------------------------------------
// Word-level diff
// ---------------------------------------------------------------------------

export type WordStatus = "ok" | "missed" | "wrong" | "extra";

export interface WordDiffEntry {
  /** Token the target expected (or null for an unexpected extra word). */
  target: string | null;
  /** What we actually heard aligned to this slot. */
  heard: string | null;
  status: WordStatus;
}

export interface WordDiff {
  words: WordDiffEntry[];
  missed: string[];
  wrong: Array<{ expected: string; heard: string }>;
  extra: string[];
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/**
 * Align target and heard tokens via classic edit-distance backtrace and
 * label each slot:
 *   ok      — same word (case/accents ignored)
 *   wrong   — target had X, speaker said Y (substitution)
 *   missed  — target word has no counterpart in heard
 *   extra   — heard a word that wasn't in the target
 */
function wordDiff(heardText: string, targetText: string): WordDiff {
  const want = tokenize(targetText);
  const got = tokenize(heardText);
  const m = want.length;
  const n = got.length;

  // DP table of edit counts.
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = want[i - 1] === got[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  // Backtrace to build per-word ops.
  const ops: WordDiffEntry[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && want[i - 1] === got[j - 1]) {
      ops.unshift({ target: want[i - 1], heard: got[j - 1], status: "ok" });
      i--;
      j--;
      continue;
    }
    const sub =
      i > 0 && j > 0 ? dp[i - 1][j - 1] : Number.POSITIVE_INFINITY;
    const del = i > 0 ? dp[i - 1][j] : Number.POSITIVE_INFINITY;
    const ins = j > 0 ? dp[i][j - 1] : Number.POSITIVE_INFINITY;
    const best = Math.min(sub, del, ins);
    if (best === sub) {
      ops.unshift({
        target: want[i - 1],
        heard: got[j - 1],
        status: "wrong",
      });
      i--;
      j--;
    } else if (best === del) {
      ops.unshift({
        target: want[i - 1],
        heard: null,
        status: "missed",
      });
      i--;
    } else {
      ops.unshift({ target: null, heard: got[j - 1], status: "extra" });
      j--;
    }
  }

  const missed = ops.filter((o) => o.status === "missed").map((o) => o.target!);
  const wrong = ops
    .filter((o) => o.status === "wrong")
    .map((o) => ({ expected: o.target!, heard: o.heard! }));
  const extra = ops.filter((o) => o.status === "extra").map((o) => o.heard!);
  return { words: ops, missed, wrong, extra };
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
  diff: WordDiff,
): string {
  const clarityNote =
    clarity < 55
      ? " Your recording was a bit unclear — try again in a quieter spot, closer to the mic."
      : "";

  // Word-specific tips are more useful than the generic "try again".
  const problemNote = buildProblemNote(diff);

  if (score >= 95) return `Excellent — every word landed.${clarityNote}`;
  if (score >= 80)
    return `Nice work.${problemNote ? " " + problemNote : ""}${clarityNote}`;
  if (score >= 60)
    return `Good attempt. We heard: "${got}". Target: "${want}".${
      problemNote ? " " + problemNote : ""
    }${clarityNote}`;
  if (score >= 30)
    return `Getting there. We heard: "${got}".${
      problemNote ? " " + problemNote : ""
    }${clarityNote}`;
  return `That didn't match. Target: "${want}". We heard: "${got}". Speak slowly and clearly.${clarityNote}`;
}

function buildProblemNote(diff: WordDiff): string {
  const parts: string[] = [];
  if (diff.wrong.length > 0) {
    const list = diff.wrong
      .slice(0, 4)
      .map((w) => `"${w.expected}" (you said "${w.heard}")`)
      .join(", ");
    parts.push(`Work on: ${list}`);
  }
  if (diff.missed.length > 0) {
    const list = diff.missed.slice(0, 4).map((w) => `"${w}"`).join(", ");
    parts.push(`Missed: ${list}`);
  }
  if (diff.extra.length > 0) {
    const list = diff.extra.slice(0, 3).map((w) => `"${w}"`).join(", ");
    parts.push(`Extra words: ${list}`);
  }
  return parts.join(". ");
}
