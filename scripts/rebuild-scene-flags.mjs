#!/usr/bin/env node
// Rebuilds `has_speaking_scene` and `has_dialog_scene` flags on each row
// of content/lessons/index.json by scanning the actual lesson JSON files.
// Safe to re-run.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));

let speakingHits = 0;
let dialogHits = 0;

for (const row of index) {
  if (!row.slug || !row.cefr_level) continue;
  const dir = row.cefr_level.replace(".", "-");
  const candidates = [
    `content/lessons/${dir}/narrative/${row.slug}.json`,
    `content/lessons/${dir}/${row.category}/${row.slug}.json`,
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
      if (row.has_speaking_scene) speakingHits++;
      if (row.has_dialog_scene) dialogHits++;
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
console.log(
  `Index rebuilt. Speaking lessons: ${speakingHits}. Dialog lessons: ${dialogHits}.`,
);
