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
  2,
);
const CLARITY_WEIGHT = clampNum(
  Number(process.env.PRONUNCIATION_CLARITY_WEIGHT),
  0,
  1,
  0.2,
);
// Logprob range used to map Whisper's per-segment confidence to a 0–100
// clarity score. Whisper's avg_logprob is negative; closer to 0 = more
// confident. For clean, correctly-pronounced English, clean audio lands
// around -0.1 .. -0.15. When Whisper "rescues" a mispronounced phrase
// (e.g. audio says "tank you" but transcription reads "thank you"), the
// logprob typically drops to -0.2 .. -0.35. A narrow range here makes
// that drop visible in the score.
const LOGPROB_FLOOR = clampNum(
  Number(process.env.PRONUNCIATION_LOGPROB_FLOOR),
  -3,
  -0.1,
  -0.7,
);
const LOGPROB_CEILING = clampNum(
  Number(process.env.PRONUNCIATION_LOGPROB_CEILING),
  -0.2,
  -0.01,
  -0.05,
);
// When the transcription matches the target but Whisper wasn't confident,
// it's a strong signal of mispronunciation that Whisper glossed over.
// Subtract a direct penalty so "tank you" vs "thank you" lands in the
// 40-60 range instead of the mid-80s.
const RESCUE_PENALTY_THRESHOLD = clampNum(
  Number(process.env.PRONUNCIATION_RESCUE_CLARITY_THRESHOLD),
  0,
  100,
  50,
);
const RESCUE_PENALTY_WEIGHT = clampNum(
  Number(process.env.PRONUNCIATION_RESCUE_PENALTY_WEIGHT),
  0,
  2,
  1.2,
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
  7,
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
  id?: number;
  start?: number;
  end?: number;
  avg_logprob?: number;
  no_speech_prob?: number;
  compression_ratio?: number;
}

interface WhisperWordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface WhisperVerboseResponse {
  text?: string;
  segments?: WhisperSegment[];
  words?: WhisperWordTimestamp[];
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
  // Word-level timestamps let us show which specific words had low
  // per-segment clarity, not just an overall number.
  groqForm.append("timestamp_granularities[]", "word");
  groqForm.append("timestamp_granularities[]", "segment");
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
  // Per-word clarity derived from word timestamps falling inside each
  // segment's [start, end]. A word inherits the clarity of its segment.
  const heardWordClarity = perWordClarity(json.words, json.segments);
  const diff = wordDiff(transcription, target, heardWordClarity);
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
 * Match each Whisper word to the segment whose [start, end] contains it
 * and inherit that segment's avg_logprob → clarity bucket. Returns a map
 * of normalized word → clarity score (0-100).
 *
 * If word timestamps aren't returned, we fall back to an empty map (all
 * words will render as "unknown clarity").
 */
function perWordClarity(
  words: WhisperWordTimestamp[] | undefined,
  segments: WhisperSegment[] | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!words || !segments) return out;
  // Pre-compute clarity per segment.
  const segClarity = segments.map((s) => ({
    start: s.start ?? 0,
    end: s.end ?? Number.POSITIVE_INFINITY,
    score: singleSegmentClarity(s),
  }));
  // Word-timestamp index tracks duplicate words using (word#occurrence).
  const seen = new Map<string, number>();
  for (const w of words) {
    const norm = normalize(w.word);
    if (!norm) continue;
    const occ = (seen.get(norm) ?? 0) + 1;
    seen.set(norm, occ);
    const key = occ === 1 ? norm : `${norm}#${occ}`;
    const mid = (w.start + w.end) / 2;
    const seg = segClarity.find((s) => mid >= s.start && mid < s.end)
      ?? segClarity[segClarity.length - 1];
    out.set(key, seg?.score ?? 50);
  }
  return out;
}

function singleSegmentClarity(s: WhisperSegment): number {
  const lp = typeof s.avg_logprob === "number" ? s.avg_logprob : -0.3;
  const noSpeech = typeof s.no_speech_prob === "number" ? s.no_speech_prob : 0;
  const span = LOGPROB_CEILING - LOGPROB_FLOOR;
  const mapped = Math.max(0, Math.min(1, (lp - LOGPROB_FLOOR) / span));
  const base = Math.pow(mapped, 1.6) * 100;
  const penalty = Math.min(60, Math.round(noSpeech * 100));
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

/**
 * Turn Whisper's per-segment stats into a 0–100 "clarity" score.
 *
 * avg_logprob is a negative number, closer to 0 = more confident. For
 * clean, correctly-pronounced English we typically see -0.1 .. -0.15.
 * When Whisper "rescues" a mispronounced phrase (output text matches
 * the target despite the audio being off), logprob drops to -0.2..-0.35.
 * When the model is genuinely guessing, -0.4 and below.
 *
 * Mapping is tuned to a narrow band (LOGPROB_FLOOR .. LOGPROB_CEILING,
 * default -0.5 .. -0.05) so that the drop Whisper experiences while
 * "correcting" bad audio is visible in the score.
 */
function clarityScore(segments: WhisperSegment[] | undefined): number {
  if (!segments || segments.length === 0) return 50; // unknown → cautious
  let logprobSum = 0;
  let noSpeechSum = 0;
  let n = 0;
  for (const s of segments) {
    if (typeof s.avg_logprob === "number") logprobSum += s.avg_logprob;
    if (typeof s.no_speech_prob === "number") noSpeechSum += s.no_speech_prob;
    n += 1;
  }
  if (n === 0) return 50;
  const avgLogprob = logprobSum / n;
  const avgNoSpeech = noSpeechSum / n;

  const span = LOGPROB_CEILING - LOGPROB_FLOOR; // e.g. 0.45
  const lp = Math.max(0, Math.min(1, (avgLogprob - LOGPROB_FLOOR) / span));
  const logprobScore = Math.pow(lp, 1.6) * 100;

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

  // Rescue penalty — the key case: Whisper transcribes the target-ish
  // text ("thank you") even though the speaker said it wrong ("tank you").
  // When similarity is high BUT clarity is low, it's a strong signal
  // Whisper used its language model to smooth over a mispronunciation.
  // Subtract a direct penalty proportional to the clarity gap so this
  // case lands in the 40–60 range instead of the 80s.
  let rescuePenalty = 0;
  if (similarity >= 90 && clarity < RESCUE_PENALTY_THRESHOLD) {
    rescuePenalty = (RESCUE_PENALTY_THRESHOLD - clarity) * RESCUE_PENALTY_WEIGHT;
  }

  // Per-word penalty — only for real word errors (wrong / missed /
  // extra). "unclear" means the right word was said with low per-word
  // clarity, and clarity is already factored into the blend above, so
  // it must NOT count here (otherwise each unclear word double-hits
  // the score — the reason "Where did you go…" with clarity 55 was
  // scoring 14 instead of ~91).
  const mistakes = diff.words.filter(
    (w) => w.status === "wrong" || w.status === "missed" || w.status === "extra",
  ).length;
  const penalized = blended - mistakes * WORD_MISTAKE_PENALTY - rescuePenalty;

  // Only award the full ceiling when every target word matched AND the
  // raw numbers say so. "unclear" counts as matched here.
  const hasAllWords = mistakes === 0;
  const ceiling =
    PERFECT_REQUIRES_ALL_WORDS && !hasAllWords ? SCORE_CEILING - 2 : SCORE_CEILING;
  return Math.max(0, Math.min(ceiling, Math.round(penalized)));
}

// ---------------------------------------------------------------------------
// Word-level diff
// ---------------------------------------------------------------------------

export type WordStatus = "ok" | "unclear" | "missed" | "wrong" | "extra";

export interface WordDiffEntry {
  /** Token the target expected (or null for an unexpected extra word). */
  target: string | null;
  /** What we actually heard aligned to this slot. */
  heard: string | null;
  status: WordStatus;
  /** 0-100 clarity for this slot (undefined when we couldn't score it). */
  clarity?: number;
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
// Below this threshold, a text-matched word is marked "unclear" instead
// of "ok" — Whisper transcribed it but wasn't confident in the audio,
// so the user likely mispronounced it even though we can't tell from
// the text alone.
const PER_WORD_UNCLEAR_THRESHOLD = clampNum(
  Number(process.env.PRONUNCIATION_PER_WORD_UNCLEAR_THRESHOLD),
  0,
  100,
  70,
);

function wordDiff(
  heardText: string,
  targetText: string,
  heardClarity: Map<string, number> = new Map(),
): WordDiff {
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

  // Backtrace to build per-word ops. Track duplicate word occurrences so
  // clarity lookups stay in sync with the tokenizer.
  const seenCounts = new Map<string, number>();
  const clarityOf = (word: string): number | undefined => {
    const occ = (seenCounts.get(word) ?? 0) + 1;
    seenCounts.set(word, occ);
    const key = occ === 1 ? word : `${word}#${occ}`;
    return heardClarity.get(key) ?? heardClarity.get(word);
  };

  const ops: WordDiffEntry[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && want[i - 1] === got[j - 1]) {
      ops.unshift({
        target: want[i - 1],
        heard: got[j - 1],
        status: "ok",
      });
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

  // Second pass: attach per-word clarity (from the heard audio) to each
  // op, and promote "ok" words with low clarity to "unclear" so the UI
  // colors them differently.
  seenCounts.clear();
  for (const op of ops) {
    if (!op.heard) continue;
    const c = clarityOf(op.heard);
    if (typeof c === "number") op.clarity = c;
    if (op.status === "ok" && typeof c === "number" && c < PER_WORD_UNCLEAR_THRESHOLD) {
      op.status = "unclear";
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
