#!/usr/bin/env node
// Balance A2 content closer to A1 by adding two short review exercises
// per A2 lesson, derived from the lesson's dialog turns. Creates one
// fill-blank and one multiple-choice exercise per lesson.
//
// Idempotent: skips lessons whose exercise IDs already include our
// generated prefix `autobal-`.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const A2_DIRS = [
  "content/lessons/a2-1/narrative",
  "content/lessons/a2-2/narrative",
  "content/lessons/a2-1/grammar",
  "content/lessons/a2-2/grammar",
  "content/lessons/a2-1/vocabulary",
  "content/lessons/a2-2/vocabulary",
];

// Remove diacritics + lowercase, keep apostrophes & punctuation.
function normalize(s) {
  return s.trim();
}

// Pick a "target word" from a sentence — the longest word >= 4 letters.
function pickTargetWord(sentence) {
  const words = sentence.split(/[\s,.?!:;"()]+/).filter(Boolean);
  const scored = words
    .map((w) => ({ w, len: w.replace(/[^A-Za-z]/g, "").length }))
    .filter((x) => x.len >= 4)
    .sort((a, b) => b.len - a.len);
  return scored[0]?.w ?? null;
}

function makeFillBlank(userTurn, slug, idx) {
  const target = userTurn.target ?? "";
  const word = pickTargetWord(target);
  if (!word) return null;
  const blanked = target.replace(new RegExp(`\\b${word}\\b`), "___");
  return {
    id: `autobal-${slug}-${idx}-fb`,
    type: "fill_blank",
    question: `Complete: "${blanked}"`,
    correct: word.replace(/[.,!?;:]$/g, ""),
    explanation: `The full phrase is: "${target}"`,
    hint_pt_br: userTurn.pt_hint ?? target,
  };
}

function makeMultipleChoice(userTurn, distractors, slug, idx) {
  const target = userTurn.target ?? "";
  const options = [target, ...distractors].slice(0, 4);
  // Shuffle deterministically for stability across re-runs.
  const ordered = [...options].sort((a, b) => a.localeCompare(b));
  const correctIdx = ordered.indexOf(target);
  return {
    id: `autobal-${slug}-${idx}-mc`,
    type: "multiple_choice",
    question: `Pick the best response. ${userTurn.pt_hint ? `(${userTurn.pt_hint})` : ""}`.trim(),
    options: ordered,
    correct: correctIdx,
    explanation: `The correct response is: "${target}"`,
    hint_pt_br: userTurn.pt_hint ?? "",
  };
}

const DISTRACTOR_POOL = [
  "I am not sure.",
  "That is a great idea.",
  "Yes, of course.",
  "Please say it again.",
  "Thank you very much.",
  "I don't know the answer.",
  "Could you repeat that?",
  "Sorry, I missed it.",
];

let touched = 0;
let skipped = 0;

for (const dir of A2_DIRS) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const file of readdirSync(full)) {
    if (!file.endsWith(".json")) continue;
    const path = join(full, file);
    const lesson = JSON.parse(readFileSync(path, "utf-8"));
    const slug = lesson.slug ?? file.replace(/\.json$/, "");

    // Skip if we already added autobal exercises.
    const already = JSON.stringify(lesson).includes("autobal-");
    if (already) {
      skipped++;
      continue;
    }

    // Prefer pulling from the dialog scene's user turns.
    const dialogScene = (lesson.scenes ?? []).find(
      (s) => s.kind === "dialog_pronunciation",
    );
    const userTurns = dialogScene?.turns?.filter((t) => t.speaker === "user") ?? [];
    if (userTurns.length < 2) {
      skipped++;
      continue;
    }

    const fb = makeFillBlank(userTurns[0], slug, 1);
    const mc = makeMultipleChoice(
      userTurns[1],
      DISTRACTOR_POOL.slice(0, 3),
      slug,
      2,
    );
    if (!fb || !mc) {
      skipped++;
      continue;
    }

    // Append the new exercises to both scenes and exercises[].
    if (Array.isArray(lesson.scenes)) {
      const insertAt = lesson.scenes.findIndex(
        (s) => s.kind === "dialog_pronunciation",
      );
      const at = insertAt >= 0 ? insertAt : lesson.scenes.length;
      lesson.scenes.splice(
        at,
        0,
        { kind: "exercise", exercise: fb },
        { kind: "exercise", exercise: mc },
      );
    }
    if (Array.isArray(lesson.exercises)) {
      lesson.exercises.push(fb, mc);
    }

    writeFileSync(path, JSON.stringify(lesson, null, 2) + "\n", "utf-8");
    touched++;
  }
}

// Update the index's exercise_count by scanning the files again.
try {
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  for (const row of index) {
    if (!row.cefr_level?.startsWith("a2")) continue;
    const dir = row.cefr_level.replace(".", "-");
    const candidates = [
      `content/lessons/${dir}/narrative/${row.slug}.json`,
      `content/lessons/${dir}/grammar/${row.slug}.json`,
      `content/lessons/${dir}/vocabulary/${row.slug}.json`,
    ];
    for (const rel of candidates) {
      try {
        const lesson = JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));
        const scenes = Array.isArray(lesson.scenes) ? lesson.scenes : [];
        const count = scenes.filter((s) => s.kind === "exercise").length;
        if (count > 0) row.exercise_count = count;
        break;
      } catch {
        // try next
      }
    }
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf-8");
} catch (e) {
  console.warn("Could not update index:", e.message);
}

console.log(`A2 lessons touched: ${touched}. Skipped: ${skipped}.`);
