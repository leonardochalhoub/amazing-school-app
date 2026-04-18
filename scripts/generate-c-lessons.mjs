#!/usr/bin/env node
// C1 + C2 lesson generator. Mirrors generate-b-lessons.mjs but pulls
// from scripts/c-curriculum.mjs and raises xp + external sources to
// advanced / proficient level. See that file for the spec shape.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as curriculum from "./c-curriculum.mjs";
const c1_specs = [
  ...(curriculum.c1_specs ?? []),
  ...(curriculum.c1_specs_part2 ?? []),
  ...(curriculum.c1_specs_part3 ?? []),
  ...(curriculum.c1_specs_part4 ?? []),
];
const c2_specs = [
  ...(curriculum.c2_specs ?? []),
  ...(curriculum.c2_specs_part2 ?? []),
  ...(curriculum.c2_specs_part3 ?? []),
  ...(curriculum.c2_specs_part4 ?? []),
];

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const BY_CEFR_PATH = join(ROOT, "content/lessons/by-cefr.json");

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const byCefr = JSON.parse(readFileSync(BY_CEFR_PATH, "utf-8"));

const cefrDir = (c) => c.replace(".", "-");
const bandOf = (c) => c.split(".")[0].toUpperCase();

const ADVANCED_SOURCES = [
  {
    label: "The Economist · Learning English",
    url: "https://www.economist.com/",
    pt_hint: "Jornalismo econômico e político sofisticado — nível C1+.",
  },
  {
    label: "TED Talks (advanced)",
    url: "https://www.ted.com/talks?language=en",
    pt_hint: "Palestras profundas com transcrição integral.",
  },
  {
    label: "The New Yorker · essays",
    url: "https://www.newyorker.com/magazine",
    pt_hint: "Ensaios literários e jornalísticos — prosa rica.",
  },
];

const PROFICIENT_SOURCES = [
  {
    label: "Aeon Essays",
    url: "https://aeon.co/essays",
    pt_hint: "Ensaios longos de filosofia, ciência e cultura.",
  },
  {
    label: "Project Gutenberg",
    url: "https://www.gutenberg.org/",
    pt_hint: "Clássicos da literatura em domínio público."
  },
  {
    label: "London Review of Books",
    url: "https://www.lrb.co.uk/",
    pt_hint: "Crítica literária e ensaios — prosa densa, C2+.",
  },
];

function sourcesFor(level) {
  return level.startsWith("c1") ? ADVANCED_SOURCES : PROFICIENT_SOURCES;
}

function xpFor(level) {
  if (level === "c1.1") return 75;
  if (level === "c1.2") return 80;
  if (level === "c2.1") return 85;
  if (level === "c2.2") return 90;
  return 75;
}

const GENERIC_MC_DISTRACTORS = [
  "I haven't heard anything about that.",
  "That is not quite correct.",
  "Please repeat the question.",
  "I am not sure, actually.",
];

function pickTargetWord(sentence) {
  const words = sentence.split(/[\s,.?!:;"()]+/).filter(Boolean);
  const scored = words
    .map((w) => ({ w, len: w.replace(/[^A-Za-z']/g, "").length }))
    .filter((x) => x.len >= 5)
    .sort((a, b) => b.len - a.len);
  return (scored[0]?.w ?? "").replace(/[.,!?;:]$/g, "");
}

function fillBlankFrom(example, slug) {
  const [en, pt] = example;
  const targetWord = pickTargetWord(en);
  if (!targetWord) return null;
  const blanked = en.replace(new RegExp(`\\b${targetWord}\\b`), "___");
  return {
    id: `gen-${slug}-fb`,
    type: "fill_blank",
    question: `Complete: "${blanked}"`,
    correct: targetWord,
    explanation: `Full sentence: "${en}"`,
    hint_pt_br: pt ?? en,
  };
}

function mcFrom(example, slug, distractors) {
  const [en, pt] = example;
  const options = [en, ...distractors].slice(0, 4);
  const ordered = [...options].sort((a, b) => a.localeCompare(b));
  const correctIdx = ordered.indexOf(en);
  return {
    id: `gen-${slug}-mc`,
    type: "multiple_choice",
    question: "Which sentence is correct?",
    options: ordered,
    correct: correctIdx,
    explanation: `Correct: "${en}"`,
    hint_pt_br: pt ?? "",
  };
}

function matchingFrom(vocab, slug) {
  return {
    id: `gen-${slug}-match`,
    type: "matching",
    pairs: vocab.slice(0, 5).map(([term, pt]) => [term, pt]),
    explanation: "Key terms from the lesson — match each to its meaning.",
    hint_pt_br: "Ligue cada termo à tradução.",
  };
}

function buildLesson(spec) {
  const { s: slug, l: level, t: title, ch, d: desc, gr, gp, ex, v, dlg, lst } = spec;

  const scenes = [
    {
      kind: "chapter_title",
      chapter: title,
      subtitle_en: desc,
      subtitle_pt: gp,
    },
    {
      kind: "narrative",
      character_id: ch,
      text_en: `${desc} Focus: ${title.toLowerCase()}. ${ex[0][0]}`,
      text_pt: `${gp} Foco: ${title.toLowerCase()}. ${ex[0][1]}`,
    },
    {
      kind: "grammar_note",
      title,
      body_en: gr,
      body_pt: gp,
      examples: ex.map(([en, pt]) => ({ en, pt })),
    },
    {
      kind: "vocab_intro",
      title: `Key vocabulary — ${title}`,
      items: v.map(([term, pt]) => ({ term, pt })),
    },
  ];

  const fb = fillBlankFrom(ex[0], slug);
  if (fb) scenes.push({ kind: "exercise", exercise: fb });
  scenes.push({
    kind: "exercise",
    exercise: mcFrom(ex[1], slug, GENERIC_MC_DISTRACTORS),
  });
  scenes.push({ kind: "exercise", exercise: matchingFrom(v, slug) });

  const dialogTurns = dlg.map(([speaker, text]) => {
    if (speaker === "ai") return { speaker: "ai", text };
    const [target, pt_hint] = text.includes("|") ? text.split("|") : [text, ""];
    return { speaker: "user", target, pt_hint };
  });
  scenes.push({
    kind: "dialog_pronunciation",
    title: `${title} — dialog`,
    character: ch.charAt(0).toUpperCase() + ch.slice(1),
    pt_summary: `Diálogo sobre ${title.toLowerCase()}. Pratique as frases marcadas.`,
    turns: dialogTurns,
  });

  scenes.push({
    kind: "listening_story",
    scene_id: `${slug}-listening-story`,
    title: lst.t,
    pt_summary:
      "Ouça com atenção. Depois, escreva em inglês o que entendeu — resumo, análise, e sua opinião crítica. O professor avaliará.",
    prompt_en: lst.pr,
    prompt_pt:
      "Escreva em inglês o que ouviu. Análise crítica com quem falou, argumentos, e sua reflexão.",
    paragraphs: lst.p.map(([speaker, voice, en]) => ({ speaker, voice, en })),
  });

  scenes.push({
    kind: "reading",
    title: "Recap reading",
    passage_en: `At Amazing School, the advanced class just finished "${title}". ${desc} ${ex[0][0]} ${ex[1][0]} Mr. Kumar reminded the students that at this level, reading widely and writing daily are non-negotiable.`,
    check: {
      question: "According to Mr. Kumar, what is non-negotiable at this level?",
      options: [
        "Grammar drills",
        "Reading widely and writing daily",
        "Memorizing idioms",
        "Watching movies",
      ],
      correct: 1,
      explanation: "At C-level, wide reading and daily writing are essential.",
      hint_pt_br: "Leitura ampla e escrita diária são essenciais no C.",
    },
  });

  scenes.push({
    kind: "listening",
    title: "Listen to Bia",
    audio_text_en: `Hello! I'm Bia, from Praia do Sol. Today in advanced class we studied "${title}". It was demanding but genuinely rewarding. See you next session!`,
    check: {
      question: "What did Bia study today?",
      options: [
        "A basic grammar rule",
        title,
        "Nothing — she skipped class",
        "A song",
      ],
      correct: 1,
      explanation: `She says the title: "${title}".`,
      hint_pt_br: `Ela fala o título: "${title}".`,
    },
  });

  scenes.push({
    kind: "further_reading",
    title: "Go deeper — advanced resources",
    body_pt:
      "Fontes avançadas pra aprofundar. Leitura regular é o que separa um aluno avançado de um proficiente.",
    sources: sourcesFor(level),
  });

  const exerciseCount = scenes.filter((s) => s.kind === "exercise").length;
  const estimatedMinutes = 35 + scenes.length * 2;

  return {
    slug,
    title,
    description: desc,
    category: "narrative",
    level: bandOf(level),
    cefr_level: level,
    xp_reward: xpFor(level),
    estimated_minutes: estimatedMinutes,
    summary_pt_br: gp,
    scenes,
    _exerciseCount: exerciseCount,
  };
}

const allSpecs = [...c1_specs, ...c2_specs];
let written = 0;
let overwritten = 0;

for (const spec of allSpecs) {
  const lesson = buildLesson(spec);
  const dir = join(ROOT, `content/lessons/${cefrDir(spec.l)}/narrative`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${spec.s}.json`);
  const existed = existsSync(file);
  const { _exerciseCount, ...payload } = lesson;
  writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");

  let row = index.find((r) => r.slug === spec.s);
  if (!row) {
    row = {
      slug: spec.s,
      title: spec.t,
      category: "narrative",
      level: bandOf(spec.l),
      cefr_level: spec.l,
      xp_reward: lesson.xp_reward,
      estimated_minutes: lesson.estimated_minutes,
      exercise_count: _exerciseCount,
    };
    index.push(row);
  } else {
    row.title = spec.t;
    row.category = "narrative";
    row.level = bandOf(spec.l);
    row.cefr_level = spec.l;
    row.xp_reward = lesson.xp_reward;
    row.estimated_minutes = lesson.estimated_minutes;
    row.exercise_count = _exerciseCount;
    overwritten++;
  }
  row.has_speaking_scene = false;
  row.has_dialog_scene = true;
  row.has_listening_scene = true;
  row.has_reading_scene = true;

  if (!Array.isArray(byCefr[spec.l])) byCefr[spec.l] = [];
  if (!byCefr[spec.l].includes(spec.s)) byCefr[spec.l].push(spec.s);

  written++;
  console.log(`${existed ? "~" : "+"} ${spec.l} ${spec.s}`);
}

for (const key of Object.keys(byCefr)) {
  byCefr[key].sort((a, b) => a.localeCompare(b));
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
writeFileSync(BY_CEFR_PATH, JSON.stringify(byCefr, null, 2) + "\n");

const totals = {};
for (const r of index) {
  const b = r.cefr_level.split(".")[0];
  totals[b] = (totals[b] ?? 0) + 1;
}
console.log(
  `\nEmitted ${written} C-level lessons (${overwritten} overwritten). Totals:`,
  totals,
);
