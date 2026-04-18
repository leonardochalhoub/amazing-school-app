#!/usr/bin/env node
// Expands every narrative lesson in content/lessons/**/narrative/*.json
// with three extra scene types at the end:
//   - reading (paragraph-length recap tied to the lesson theme)
//   - listening (TTS-friendly short listening task)
//   - further_reading (curated free-web sources)
//
// Each expansion adds ~10 minutes to estimated_minutes. Idempotent —
// if a reading/listening/further_reading scene already exists, we skip.
//
// Also updates content/lessons/index.json estimated_minutes + exercise_count.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "content", "lessons");
const INDEX_PATH = path.join(ROOT, "index.json");

// Free, evergreen learning-English resources. Rotated per lesson so
// students see different sources over the course.
const SOURCE_POOLS = {
  a1: [
    { label: "BBC Learning English · Beginners", url: "https://www.bbc.co.uk/learningenglish/english/course/lower-beginner", pt_hint: "Curso gratuito da BBC, nível iniciante." },
    { label: "VOA Learning English", url: "https://learningenglish.voanews.com/", pt_hint: "Notícias em inglês lento — ótimo para ouvido iniciante." },
    { label: "British Council · A1", url: "https://learnenglish.britishcouncil.org/skills/speaking/a1-speaking", pt_hint: "Diálogos A1 do British Council, com áudio." },
    { label: "Cambridge Dictionary · EN↔PT", url: "https://dictionary.cambridge.org/dictionary/english-portuguese/", pt_hint: "Dicionário Cambridge, inglês → português." },
    { label: "English Grammar In Use (preview)", url: "https://www.cambridge.org/elt/catalogue/subject/project/item5747361/", pt_hint: "Livro clássico de gramática inglesa — disponível em amostra." },
  ],
  a2: [
    { label: "BBC Learning English · Lower Intermediate", url: "https://www.bbc.co.uk/learningenglish/english/course/lower-intermediate", pt_hint: "Curso BBC para nível pré-intermediário." },
    { label: "British Council · A2", url: "https://learnenglish.britishcouncil.org/skills/reading/a2-reading", pt_hint: "Leituras A2 com exercícios de compreensão." },
    { label: "VOA Learning English · Everyday Grammar", url: "https://learningenglish.voanews.com/z/3808", pt_hint: "Vídeos curtos sobre gramática do dia a dia." },
    { label: "Perfect English Grammar", url: "https://www.perfect-english-grammar.com/", pt_hint: "Regras de gramática + exercícios interativos gratuitos." },
    { label: "ThoughtCo · English for Learners", url: "https://www.thoughtco.com/english-as-a-second-language-4133121", pt_hint: "Artigos explicativos organizados por nível." },
  ],
  b1: [
    { label: "BBC 6 Minute English", url: "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english", pt_hint: "Podcast de 6 minutos com transcrição — nível B1." },
    { label: "British Council · B1", url: "https://learnenglish.britishcouncil.org/skills/reading/b1-reading", pt_hint: "Textos B1 com compreensão." },
    { label: "Engoo Daily News", url: "https://engoo.com/app/daily-news", pt_hint: "Notícias diárias graduadas por nível." },
    { label: "Oxford Learner's Dictionary", url: "https://www.oxfordlearnersdictionaries.com/", pt_hint: "Dicionário Oxford com exemplos e áudio." },
  ],
  b2: [
    { label: "BBC News · Learning English", url: "https://www.bbc.co.uk/learningenglish/english/features/news-review", pt_hint: "Análises de notícias reais da BBC." },
    { label: "TED Talks with subtitles", url: "https://www.ted.com/talks?language=en", pt_hint: "Palestras reais com legenda EN/PT — ouça, leia, repita." },
    { label: "Cambridge Dictionary · thesaurus", url: "https://dictionary.cambridge.org/thesaurus/", pt_hint: "Sinônimos com exemplos — essencial em B2+." },
    { label: "Grammarly Blog", url: "https://www.grammarly.com/blog/", pt_hint: "Explicações aprofundadas de gramática e estilo." },
  ],
};

function pickSources(level, slug) {
  const pool = SOURCE_POOLS[level.slice(0, 2)] ?? SOURCE_POOLS.a1;
  // Stable pick based on slug so re-runs produce the same 3 sources.
  let seed = 0;
  for (const c of slug) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push(pool[(seed + i * 13) % pool.length]);
  }
  return out;
}

function buildReading(song) {
  // Generic reading: recap of the lesson theme from a character's POV.
  // Each lesson's description is repurposed into a ~80-word passage.
  const char = song.scenes?.find((s) => s.kind === "narrative" && s.character_id)
    ?.character_id ?? "kumar";
  const title = song.title;
  const topic = song.description;
  const passage_en =
    `At Amazing School, the class just finished "${title}". ` +
    `${topic} ` +
    `Mr. Kumar reminded the students that practice is the key — listen, read aloud, write your own examples. ` +
    `Every small step adds up. The ocean in Praia do Sol keeps moving, and so does your English.`;
  return {
    kind: "reading",
    title: "Recap reading",
    passage_en,
    check: {
      question: "According to Mr. Kumar, what is the key to learning?",
      options: ["Memorization", "Practice", "Luck", "Grammar rules"],
      correct: 1,
      explanation: "Practice — listen, read aloud, write your own examples.",
      hint_pt_br: "A chave é a prática: ouvir, ler em voz alta, escrever seus próprios exemplos.",
    },
  };
}

function buildListening(song) {
  // Short TTS passage students can replay via the SpeakButton, plus one
  // comprehension check.
  const audio_text_en =
    `Hello! I'm Bia, from Praia do Sol. Today in class we studied "${song.title}". ` +
    `I liked it because it was clear and short. ` +
    `Tomorrow we will practice again. See you then!`;
  return {
    kind: "listening",
    title: "Listen to Bia",
    audio_text_en,
    check: {
      question: "What did Bia study today?",
      options: [
        "A grammar rule about the past",
        song.title,
        "Nothing — she skipped class",
        "A song",
      ],
      correct: 1,
      explanation: `She says: "Today in class we studied '${song.title}'".`,
      hint_pt_br: `Ela fala claramente o título: "${song.title}".`,
    },
  };
}

function buildFurtherReading(song) {
  const sources = pickSources(song.cefr_level, song.slug);
  return {
    kind: "further_reading",
    title: "Go deeper — free resources",
    body_pt:
      "Fontes gratuitas e confiáveis para você estudar mais. Salve os links e volte sempre.",
    sources,
  };
}

function expandLesson(lessonPath) {
  const raw = JSON.parse(fs.readFileSync(lessonPath, "utf8"));
  if (!Array.isArray(raw.scenes)) return { changed: false, lesson: raw };
  const kinds = new Set(raw.scenes.map((s) => s.kind));
  let changed = false;
  const additions = [];
  if (!kinds.has("reading")) additions.push(buildReading(raw));
  if (!kinds.has("listening")) additions.push(buildListening(raw));
  if (!kinds.has("further_reading")) additions.push(buildFurtherReading(raw));
  if (additions.length === 0) return { changed: false, lesson: raw };
  raw.scenes.push(...additions);
  // Bump the estimated_minutes to reflect the added content.
  raw.estimated_minutes = Math.max(
    raw.estimated_minutes ?? 10,
    (raw.estimated_minutes ?? 10) + additions.length * 3
  );
  fs.writeFileSync(lessonPath, JSON.stringify(raw, null, 2) + "\n");
  changed = true;
  return { changed, lesson: raw };
}

let expanded = 0;
const updatedMinutes = new Map();
const updatedExerciseCount = new Map();

for (const dir of fs.readdirSync(ROOT)) {
  const narrativeDir = path.join(ROOT, dir, "narrative");
  if (!fs.existsSync(narrativeDir)) continue;
  for (const file of fs.readdirSync(narrativeDir)) {
    if (!file.endsWith(".json")) continue;
    const { changed, lesson } = expandLesson(path.join(narrativeDir, file));
    if (changed) expanded++;
    updatedMinutes.set(lesson.slug, lesson.estimated_minutes);
    const exerciseCount = (lesson.scenes ?? []).filter(
      (s) => s.kind === "exercise" || s.kind === "pronunciation"
    ).length;
    updatedExerciseCount.set(lesson.slug, exerciseCount);
  }
}

const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
let indexChanged = 0;
for (const entry of index) {
  const nm = updatedMinutes.get(entry.slug);
  const nc = updatedExerciseCount.get(entry.slug);
  if (nm != null && nm !== entry.estimated_minutes) {
    entry.estimated_minutes = nm;
    indexChanged++;
  }
  if (nc != null && nc !== entry.exercise_count) {
    entry.exercise_count = nc;
  }
}
fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");

console.log(`Expanded ${expanded} lessons. Index entries updated: ${indexChanged}.`);
