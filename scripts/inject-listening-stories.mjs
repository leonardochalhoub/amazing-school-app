#!/usr/bin/env node
// Inject a `listening_story` scene into every A1/A2 lesson. The story is
// derived from that lesson's dialog: we take the first 4-6 turns, wrap
// them with a short narrator intro + outro, and assign distinct voices
// to AI vs user speakers so browser TTS reads the story with different
// voices per character.
//
// Idempotent: replaces any existing listening_story scene rather than
// appending duplicates. Re-run any time.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");

const DIRS = [
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

function buildStory(lesson) {
  const dialog = (lesson.scenes ?? []).find(
    (s) => s.kind === "dialog_pronunciation",
  );
  if (!dialog) return null;

  const dialogCharacter = dialog.character ?? "A friend";
  const userSpeakerName = "The student";

  // Pick the first 4-6 turns from the dialog for the story body.
  const body = (dialog.turns ?? []).slice(0, 6);

  const paragraphs = [];

  // Narrator opening frames the scene.
  paragraphs.push({
    speaker: "Narrator",
    voice: "narrator",
    en: `In this story, we meet ${dialogCharacter} and a student. ${
      lesson.description ?? ""
    } Listen carefully and think about what each person says.`.trim(),
  });

  for (const t of body) {
    if (t.speaker === "ai") {
      paragraphs.push({
        speaker: dialogCharacter,
        voice: "female1",
        en: t.text,
      });
    } else if (t.speaker === "user") {
      paragraphs.push({
        speaker: userSpeakerName,
        voice: "male1",
        en: t.target,
      });
    }
  }

  // Narrator closing prompts the writer.
  paragraphs.push({
    speaker: "Narrator",
    voice: "narrator",
    en: `That is the end of our short scene with ${dialogCharacter}. Think about what you heard and how the conversation felt.`,
  });

  // Cap the paragraph count at 8 to stay inside the 4-10 target band.
  const capped = paragraphs.slice(0, 8);

  return {
    kind: "listening_story",
    scene_id: `${lesson.slug}-listening-story`,
    title: `Listening story — ${lesson.title}`,
    pt_summary:
      "Ouça a situação com atenção. Depois, escreva em inglês o que você entendeu — resumo, detalhes, seus pensamentos. O professor vai ler e comentar.",
    prompt_en:
      "Write in English what you heard. A short summary is fine. Mention who spoke, what they said, and what you think about the situation.",
    prompt_pt:
      "Escreva em inglês o que você ouviu. Pode ser um resumo curto. Diga quem falou, o que disseram e o que você achou.",
    paragraphs: capped,
  };
}

let injected = 0;
let replaced = 0;
let skipped = 0;

for (const dir of DIRS) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const file of readdirSync(full)) {
    if (!file.endsWith(".json")) continue;
    const path = join(full, file);
    const lesson = JSON.parse(readFileSync(path, "utf-8"));
    if (!Array.isArray(lesson.scenes)) {
      skipped++;
      continue;
    }

    const story = buildStory(lesson);
    if (!story) {
      skipped++;
      continue;
    }

    // Remove any existing listening_story scene.
    const existingIdx = lesson.scenes.findIndex(
      (s) => s.kind === "listening_story",
    );
    const isReplace = existingIdx >= 0;
    if (isReplace) {
      lesson.scenes.splice(existingIdx, 1);
      replaced++;
    } else {
      injected++;
    }

    // Place the listening_story right BEFORE the reading scene (after
    // the dialog + exercises, before the recap). If there is no reading
    // scene, place before the listening scene; else append.
    let insertAt = lesson.scenes.findIndex((s) => s.kind === "reading");
    if (insertAt < 0) insertAt = lesson.scenes.findIndex((s) => s.kind === "listening");
    if (insertAt < 0) insertAt = lesson.scenes.length;
    lesson.scenes.splice(insertAt, 0, story);

    if (!isReplace && typeof lesson.estimated_minutes === "number") {
      lesson.estimated_minutes = lesson.estimated_minutes + 5;
    }

    writeFileSync(path, JSON.stringify(lesson, null, 2) + "\n", "utf-8");
  }
}

// Update index estimated_minutes (only for A1/A2 rows that got their
// first injection, not replacements — we tracked minutes above).
try {
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  for (const row of index) {
    if (!row.cefr_level) continue;
    if (!row.cefr_level.startsWith("a1") && !row.cefr_level.startsWith("a2")) {
      continue;
    }
    const dir = row.cefr_level.replace(".", "-");
    const candidates = [
      `content/lessons/${dir}/narrative/${row.slug}.json`,
      `content/lessons/${dir}/grammar/${row.slug}.json`,
      `content/lessons/${dir}/vocabulary/${row.slug}.json`,
    ];
    for (const rel of candidates) {
      try {
        const lesson = JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));
        row.estimated_minutes = lesson.estimated_minutes;
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

console.log(
  `Listening stories — Injected: ${injected}. Replaced: ${replaced}. Skipped: ${skipped}.`,
);
