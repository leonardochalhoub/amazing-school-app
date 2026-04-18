#!/usr/bin/env node
// Inject one dialog_pronunciation scene into each A1/A2 lesson JSON, pulling
// content from content/lesson-dialogs.json (keyed by slug).
//
// Placement: inserted BEFORE the final `reading` scene (so it comes after
// the regular exercises but before the recap). If no reading scene exists,
// appended at the end.
//
// Re-entrant: if a dialog_pronunciation scene already exists, it is replaced
// with the current catalog version.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CATALOG_PATH = join(ROOT, "content/lesson-dialogs.json");
const INDEX_PATH = join(ROOT, "content/lessons/index.json");

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
const dialogMap = catalog.dialogs;

const A1_A2_DIRS = [
  "content/lessons/a1-1/narrative",
  "content/lessons/a1-2/narrative",
  "content/lessons/a2-1/narrative",
  "content/lessons/a2-2/narrative",
  "content/lessons/a1-1/grammar",
  "content/lessons/a1-2/grammar",
  "content/lessons/a2-1/grammar",
  "content/lessons/a2-2/grammar",
  "content/lessons/a1-1/vocabulary",
  "content/lessons/a1-2/vocabulary",
  "content/lessons/a2-1/vocabulary",
  "content/lessons/a2-2/vocabulary",
];

let injected = 0;
let skipped = 0;
let replaced = 0;
const missing = [];

for (const dir of A1_A2_DIRS) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const file of readdirSync(full)) {
    if (!file.endsWith(".json")) continue;
    const path = join(full, file);
    const slug = file.replace(/\.json$/, "");
    const entry = dialogMap[slug];
    if (!entry) {
      missing.push(slug);
      continue;
    }

    const lesson = JSON.parse(readFileSync(path, "utf-8"));

    // Drill lessons carry `exercises[]` but no `scenes[]`. Upgrade them
    // by wrapping each exercise in an exercise scene so NarrativePlayer
    // can render them alongside the injected dialog.
    if (!Array.isArray(lesson.scenes) || lesson.scenes.length === 0) {
      if (!Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
        skipped++;
        continue;
      }
      lesson.scenes = [
        {
          kind: "chapter_title",
          chapter: lesson.title,
          subtitle_en: lesson.description,
        },
        ...lesson.exercises.map((ex) => ({ kind: "exercise", exercise: ex })),
      ];
    }

    const dialogScene = {
      kind: "dialog_pronunciation",
      title: entry.title,
      character: entry.character,
      pt_summary: entry.pt_summary,
      turns: entry.turns,
    };

    // Remove any existing dialog_pronunciation scene.
    const existing = lesson.scenes.findIndex(
      (s) => s.kind === "dialog_pronunciation",
    );
    const isReplace = existing >= 0;
    if (isReplace) {
      lesson.scenes.splice(existing, 1);
      replaced++;
    } else {
      injected++;
    }

    // Insert before the first `reading` scene, else before the first
    // `listening` scene, else append.
    const readingIdx = lesson.scenes.findIndex((s) => s.kind === "reading");
    const listeningIdx = lesson.scenes.findIndex((s) => s.kind === "listening");
    let insertAt = lesson.scenes.length;
    if (readingIdx >= 0) insertAt = readingIdx;
    else if (listeningIdx >= 0) insertAt = listeningIdx;
    lesson.scenes.splice(insertAt, 0, dialogScene);

    // Only bump estimated minutes on first injection (not replacement).
    if (!isReplace && typeof lesson.estimated_minutes === "number") {
      lesson.estimated_minutes = lesson.estimated_minutes + 4;
    }

    writeFileSync(path, JSON.stringify(lesson, null, 2) + "\n", "utf-8");
  }
}

// Rebuild index flags by scanning each lesson file.
try {
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  for (const row of index) {
    if (!row.slug || !row.cefr_level) continue;
    const dir = row.cefr_level.replace(".", "-");
    const candidates = [
      `content/lessons/${dir}/narrative/${row.slug}.json`,
      `content/lessons/${dir}/grammar/${row.slug}.json`,
      `content/lessons/${dir}/vocabulary/${row.slug}.json`,
      `content/lessons/${dir}/reading/${row.slug}.json`,
      `content/lessons/${dir}/listening/${row.slug}.json`,
    ];
    let loaded = false;
    for (const rel of candidates) {
      try {
        const lesson = JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));
        const scenes = Array.isArray(lesson.scenes) ? lesson.scenes : [];
        row.has_speaking_scene = scenes.some((s) => s.kind === "pronunciation");
        row.has_dialog_scene = scenes.some(
          (s) => s.kind === "dialog_pronunciation",
        );
        loaded = true;
        break;
      } catch {
        // try next
      }
    }
    if (!loaded) {
      row.has_speaking_scene = false;
      row.has_dialog_scene = false;
    }
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf-8");
} catch (e) {
  console.warn("Could not update index:", e.message);
}

console.log(
  `Injected: ${injected}. Replaced existing: ${replaced}. Skipped: ${skipped}.`,
);
if (missing.length) {
  console.log(`Missing dialog entries for ${missing.length} lessons:`);
  for (const slug of missing) console.log(`  - ${slug}`);
}
