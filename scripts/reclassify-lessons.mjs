#!/usr/bin/env node
// Move selected lessons from one CEFR sub-level to another.
// Updates: lesson JSON (level + cefr_level + file path),
// content/lessons/index.json (level + cefr_level),
// content/lessons/by-cefr.json (slug moved between buckets).

import {
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const BY_CEFR_PATH = join(ROOT, "content/lessons/by-cefr.json");

// slug → new cefr_level (sub-level). Level is derived from the prefix.
const MOVES = {
  "th-playlist": "a2.1",
  "thinking-through-thunder": "a2.1",
  "mother-brother-another": "a2.1",
  "bias-first-wave": "a2.1",
  "rafas-morning": "a2.1",
  "thursdays-three-things": "a2.1",
};

function levelFor(cefr) {
  return cefr.split(".")[0].toUpperCase();
}

function cefrDir(cefr) {
  return cefr.replace(".", "-");
}

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const byCefr = JSON.parse(readFileSync(BY_CEFR_PATH, "utf-8"));

let moved = 0;

for (const [slug, targetCefr] of Object.entries(MOVES)) {
  const row = index.find((r) => r.slug === slug);
  if (!row) {
    console.warn(`! no index row for ${slug}`);
    continue;
  }
  const sourceCefr = row.cefr_level;
  if (sourceCefr === targetCefr) {
    console.log(`= ${slug} already at ${targetCefr}`);
    continue;
  }

  const sourceDir = join(
    ROOT,
    `content/lessons/${cefrDir(sourceCefr)}/${row.category}`,
  );
  const targetDir = join(
    ROOT,
    `content/lessons/${cefrDir(targetCefr)}/${row.category}`,
  );
  const sourceFile = join(sourceDir, `${slug}.json`);
  const targetFile = join(targetDir, `${slug}.json`);

  if (!existsSync(sourceFile)) {
    console.warn(`! missing source file for ${slug}: ${sourceFile}`);
    continue;
  }
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Update lesson JSON in place, then rename.
  const lesson = JSON.parse(readFileSync(sourceFile, "utf-8"));
  lesson.level = levelFor(targetCefr);
  lesson.cefr_level = targetCefr;
  writeFileSync(sourceFile, JSON.stringify(lesson, null, 2) + "\n");
  renameSync(sourceFile, targetFile);

  // Update index row.
  row.cefr_level = targetCefr;
  row.level = levelFor(targetCefr);

  // Update by-cefr.json buckets.
  if (Array.isArray(byCefr[sourceCefr])) {
    byCefr[sourceCefr] = byCefr[sourceCefr].filter((s) => s !== slug);
  }
  if (!Array.isArray(byCefr[targetCefr])) byCefr[targetCefr] = [];
  if (!byCefr[targetCefr].includes(slug)) byCefr[targetCefr].push(slug);

  moved++;
  console.log(`→ ${slug}: ${sourceCefr} → ${targetCefr}`);
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
writeFileSync(BY_CEFR_PATH, JSON.stringify(byCefr, null, 2) + "\n");

console.log(`\nDone. Moved ${moved} lesson(s).`);

// Print the new band totals.
const totals = {};
for (const r of index) {
  const b = r.cefr_level.split(".")[0];
  totals[b] = (totals[b] ?? 0) + 1;
}
console.log("Totals by band:", totals);
