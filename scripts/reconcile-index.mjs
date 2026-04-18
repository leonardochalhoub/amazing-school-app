#!/usr/bin/env node
// Reconciles content/lessons/index.json and by-cefr.json against the
// actual lesson JSON files on disk. Adds rows for any lesson file not
// yet represented in the index, and rewrites by-cefr.json from scratch
// so every cefr sub-level bucket lists every lesson at that level, in
// a stable alphabetical order.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const BY_CEFR_PATH = join(ROOT, "content/lessons/by-cefr.json");

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".json")) out.push(full);
  }
  return out;
}

const lessonFiles = walk(join(ROOT, "content/lessons")).filter(
  (p) =>
    !p.endsWith("/index.json") &&
    !p.endsWith("/by-cefr.json") &&
    !p.includes("/.") &&
    !p.includes("/lesson-dialogs.json"),
);

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const bySlug = new Map(index.map((r) => [r.slug, r]));

let added = 0;
for (const file of lessonFiles) {
  let j;
  try {
    j = JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    continue;
  }
  if (!j || typeof j.slug !== "string") continue;
  if (bySlug.has(j.slug)) continue;

  const scenes = Array.isArray(j.scenes) ? j.scenes : [];
  const exerciseCount = Array.isArray(j.exercises)
    ? j.exercises.length
    : scenes.filter((s) => s.kind === "exercise").length;

  const row = {
    slug: j.slug,
    title: j.title ?? j.slug,
    category: j.category ?? "narrative",
    level: (j.level ?? j.cefr_level?.split(".")[0] ?? "A1").toUpperCase(),
    cefr_level: j.cefr_level ?? "a1.1",
    xp_reward: typeof j.xp_reward === "number" ? j.xp_reward : 30,
    estimated_minutes:
      typeof j.estimated_minutes === "number" ? j.estimated_minutes : 20,
    exercise_count: exerciseCount,
    has_speaking_scene: scenes.some((s) => s.kind === "pronunciation"),
    has_dialog_scene: scenes.some((s) => s.kind === "dialog_pronunciation"),
    has_listening_scene: scenes.some(
      (s) => s.kind === "listening" || s.kind === "listening_story",
    ),
    has_reading_scene: scenes.some(
      (s) => s.kind === "reading" || s.kind === "further_reading",
    ),
  };
  index.push(row);
  bySlug.set(j.slug, row);
  console.log(`+ ${j.slug} (${row.cefr_level} ${row.category})`);
  added++;
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");

// Rebuild by-cefr.json from scratch.
const byCefr = {
  "a1.1": [],
  "a1.2": [],
  "a2.1": [],
  "a2.2": [],
  "b1.1": [],
  "b1.2": [],
  "b2.1": [],
  "b2.2": [],
  "c1.1": [],
  "c1.2": [],
};
for (const row of index) {
  const key = row.cefr_level;
  if (!byCefr[key]) byCefr[key] = [];
  byCefr[key].push(row.slug);
}
for (const key of Object.keys(byCefr)) {
  byCefr[key].sort((a, b) => a.localeCompare(b));
}
writeFileSync(BY_CEFR_PATH, JSON.stringify(byCefr, null, 2) + "\n");

console.log(`\nIndex reconciled. Added: ${added}.`);

const totals = {};
for (const r of index) {
  const b = r.cefr_level.split(".")[0];
  totals[b] = (totals[b] ?? 0) + 1;
}
console.log("Totals by band:", totals);
