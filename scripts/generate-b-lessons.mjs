#!/usr/bin/env node
// Expands compact lesson specs in scripts/b-curriculum.mjs into full
// lesson JSONs (chapter_title + grammar + vocab + exercises + dialog +
// listening + reading + further_reading) for B1 and B2.
//
// Each compact spec looks like:
//   {
//     s: slug,  l: cefr_level,  t: title,  ch: character_id,
//     d: one-line description,
//     gr: grammar rule EN,  gp: grammar rule PT,
//     ex: [[en, pt], ...] 3 example sentences,
//     v:  [[term, pt], ...] 5 vocab items,
//     dlg:[[speaker, text], ...] 11 alternating AI/user turns,
//     lst:{ t: listening title, pr: write prompt EN, p: [[speaker, voice, en], ...] }
//   }
//
// Emits to content/lessons/<band-dir>/narrative/<slug>.json.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { b1_specs, b2_specs } from "./b-curriculum.mjs";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "content/lessons/index.json");
const BY_CEFR_PATH = join(ROOT, "content/lessons/by-cefr.json");

const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const byCefr = JSON.parse(readFileSync(BY_CEFR_PATH, "utf-8"));

function cefrDir(cefr) {
  return cefr.replace(".", "-");
}

function bandOf(cefr) {
  return cefr.split(".")[0].toUpperCase();
}

function sourcesFor(level) {
  // B-level students should hit real-world content.
  if (level === "b1.1" || level === "b1.2") {
    return [
      {
        label: "BBC 6 Minute English",
        url: "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english",
        pt_hint: "Podcast curto com transcrição — nível B1.",
      },
      {
        label: "British Council · B1",
        url: "https://learnenglish.britishcouncil.org/skills/reading/b1-reading",
        pt_hint: "Textos B1 com compreensão.",
      },
      {
        label: "VOA Learning English",
        url: "https://learningenglish.voanews.com/",
        pt_hint: "Notícias e áudios em inglês adaptado.",
      },
    ];
  }
  return [
    {
      label: "BBC News · Learning English",
      url: "https://www.bbc.co.uk/learningenglish/english/features/news-review",
      pt_hint: "Análise de notícias reais da BBC.",
    },
    {
      label: "TED Talks with subtitles",
      url: "https://www.ted.com/talks?language=en",
      pt_hint: "Palestras reais com legenda — ouça, leia, repita.",
    },
    {
      label: "Cambridge Dictionary · thesaurus",
      url: "https://dictionary.cambridge.org/thesaurus/",
      pt_hint: "Sinônimos com exemplos — essencial em B2+.",
    },
  ];
}

function xpFor(level) {
  switch (level) {
    case "b1.1":
      return 55;
    case "b1.2":
      return 60;
    case "b2.1":
      return 65;
    case "b2.2":
      return 70;
    default:
      return 55;
  }
}

/**
 * Build an exercise from the first example sentence — fill_blank on the
 * longest content word.
 */
function fillBlankFrom(example, slug) {
  const [en, pt] = example;
  const words = en.split(/[\s,.?!:;"()]+/).filter(Boolean);
  const scored = words
    .map((w) => ({ w, len: w.replace(/[^A-Za-z']/g, "").length }))
    .filter((x) => x.len >= 4)
    .sort((a, b) => b.len - a.len);
  const targetWord = (scored[0]?.w ?? "").replace(/[.,!?;:]$/g, "");
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

/**
 * Build a multiple-choice exercise from the second example — ask for
 * the correct sentence among near-distractors.
 */
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
    explanation: `The correct sentence is: "${en}"`,
    hint_pt_br: pt ?? "",
  };
}

/**
 * Build a matching exercise from the vocab list.
 */
function matchingFrom(vocab, slug) {
  return {
    id: `gen-${slug}-match`,
    type: "matching",
    pairs: vocab.slice(0, 5).map(([term, pt]) => [term, pt]),
    explanation:
      "Five key terms from the lesson. Match each English word to its Portuguese meaning.",
    hint_pt_br: "Ligue cada palavra à tradução.",
  };
}

const GENERIC_MC_DISTRACTORS = [
  "I haven't heard anything about that.",
  "That is not quite correct.",
  "Please repeat the question.",
  "I am not sure, actually.",
];

function buildLesson(spec) {
  const { s: slug, l: level, t: title, ch, d: desc, gr, gp, ex, v, dlg, lst } = spec;

  const chapter = {
    kind: "chapter_title",
    chapter: title,
    subtitle_en: desc,
    subtitle_pt: gp,
  };

  const narrative = {
    kind: "narrative",
    character_id: ch,
    text_en: `${desc} Today's focus: ${title.toLowerCase()}. ${ex[0][0]}`,
    text_pt: `${gp} Foco de hoje: ${title.toLowerCase()}. ${ex[0][1]}`,
  };

  const grammar = {
    kind: "grammar_note",
    title,
    body_en: gr,
    body_pt: gp,
    examples: ex.map(([en, pt]) => ({ en, pt })),
  };

  const vocab = {
    kind: "vocab_intro",
    title: `Key vocabulary — ${title}`,
    items: v.map(([term, pt]) => ({ term, pt })),
  };

  const exerciseScenes = [];
  const fb = fillBlankFrom(ex[0], slug);
  if (fb) exerciseScenes.push({ kind: "exercise", exercise: fb });
  const mc = mcFrom(ex[1], slug, GENERIC_MC_DISTRACTORS);
  exerciseScenes.push({ kind: "exercise", exercise: mc });
  exerciseScenes.push({ kind: "exercise", exercise: matchingFrom(v, slug) });

  // Dialog — expect 11 alternating turns starting AI, ending AI.
  const dialogTurns = dlg.map(([speaker, text]) => {
    if (speaker === "ai") {
      return { speaker: "ai", text };
    }
    // user turns may carry a hint after a | separator.
    const [target, pt_hint] = text.includes("|") ? text.split("|") : [text, ""];
    return { speaker: "user", target, pt_hint };
  });
  const dialog = {
    kind: "dialog_pronunciation",
    title: `${title} — dialog`,
    character: ch.charAt(0).toUpperCase() + ch.slice(1),
    pt_summary: `Diálogo sobre ${title.toLowerCase()}. Pratique as frases marcadas.`,
    turns: dialogTurns,
  };

  const listening = {
    kind: "listening_story",
    scene_id: `${slug}-listening-story`,
    title: lst.t,
    pt_summary:
      "Ouça com atenção. Depois, escreva em inglês o que entendeu — resumo, detalhes e sua opinião. O professor vai ler e comentar.",
    prompt_en: lst.pr,
    prompt_pt:
      "Escreva em inglês o que ouviu. Resumo curto com quem falou, o que disseram e sua opinião.",
    paragraphs: lst.p.map(([speaker, voice, en]) => ({ speaker, voice, en })),
  };

  const reading = {
    kind: "reading",
    title: "Recap reading",
    passage_en: `At Amazing School, the class just finished "${title}". ${desc} ${ex[0][0]} ${ex[1][0]} Mr. Kumar reminded the students that practice is the key — listen, read aloud, write your own examples. Every small step adds up.`,
    check: {
      question: "According to Mr. Kumar, what is the key to learning?",
      options: ["Memorization", "Practice", "Luck", "Grammar rules"],
      correct: 1,
      explanation: "Practice — listen, read aloud, write your own examples.",
      hint_pt_br: "Prática: ouvir, ler em voz alta, escrever exemplos.",
    },
  };

  const listeningShort = {
    kind: "listening",
    title: "Listen to Bia",
    audio_text_en: `Hello! I'm Bia, from Praia do Sol. Today in class we studied "${title}". I liked it because it was clear and useful. See you next time!`,
    check: {
      question: "What did Bia study today?",
      options: [
        "A grammar rule from last year",
        title,
        "Nothing — she skipped class",
        "A song",
      ],
      correct: 1,
      explanation: `She says: "${title}".`,
      hint_pt_br: `Ela fala o título: "${title}".`,
    },
  };

  const furtherReading = {
    kind: "further_reading",
    title: "Go deeper — free resources",
    body_pt:
      "Fontes gratuitas e confiáveis para continuar praticando. Salve os links e volte sempre.",
    sources: sourcesFor(level),
  };

  const scenes = [
    chapter,
    narrative,
    grammar,
    vocab,
    ...exerciseScenes,
    dialog,
    listening,
    reading,
    listeningShort,
    furtherReading,
  ];

  const exerciseCount = scenes.filter((s) => s.kind === "exercise").length;
  const estimatedMinutes = 30 + scenes.length * 2;

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

const allSpecs = [...b1_specs, ...b2_specs];
let written = 0;
let overwritten = 0;

for (const spec of allSpecs) {
  const lesson = buildLesson(spec);
  const dir = join(
    ROOT,
    `content/lessons/${cefrDir(spec.l)}/narrative`,
  );
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${spec.s}.json`);
  const existed = existsSync(file);
  const { _exerciseCount, ...payload } = lesson;
  writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");

  // Update / insert index row.
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

  // Update by-cefr bucket.
  if (!Array.isArray(byCefr[spec.l])) byCefr[spec.l] = [];
  if (!byCefr[spec.l].includes(spec.s)) byCefr[spec.l].push(spec.s);

  written++;
  console.log(
    `${existed ? "~" : "+"} ${spec.l} ${spec.s}` + (existed ? " (overwritten)" : ""),
  );
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
  `\nEmitted ${written} lessons (${overwritten} overwritten). Totals by band:`,
  totals,
);
