#!/usr/bin/env node
// Enriches song JSON files with LRCLIB-sourced sing_along prompts and
// listen_and_fill exercises. All lyric text comes from LRCLIB's
// community-curated synced-lyrics API — no hard-coded lyrics in this repo's
// authored content, only short fair-use excerpts pulled at script-run time.
//
// Usage:
//   node scripts/enrich-music.mjs              # all songs missing sing_along or exercises
//   node scripts/enrich-music.mjs --force      # re-enrich everything, overwriting
//   node scripts/enrich-music.mjs <slug>       # one song
//
// The song JSON must already have: slug, title, artist, album, duration_seconds.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");
const USER_AGENT = "amazing-school-app/0.2 (English teaching platform; +lrclib enrich)";

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLrc(lrcText) {
  const out = [];
  if (!lrcText) return out;
  const re = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  for (const raw of lrcText.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const frac = m[3] ? Number(`0.${m[3]}`) : 0;
    const t = min * 60 + sec + frac;
    const text = (m[4] || "").trim();
    if (text.length === 0) continue;
    out.push({ t, text });
  }
  return out;
}

async function fetchLrc({ artist, title, album, duration }) {
  const tryParams = (includeAlbum) => {
    const p = new URLSearchParams({ artist_name: artist, track_name: title });
    if (includeAlbum && album) p.set("album_name", album);
    if (duration) p.set("duration", String(duration));
    return p;
  };
  // 1. exact get
  for (const includeAlbum of [true, false]) {
    const url = `https://lrclib.net/api/get?${tryParams(includeAlbum)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
    const json = await res.json();
    if (json.syncedLyrics) return json.syncedLyrics;
  }
  // 2. search fallback — pick best match with syncedLyrics and closest duration
  const q = `${artist} ${title}`;
  const res = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  const artistN = normalize(artist);
  const titleN = normalize(title);
  const scored = results
    .filter((x) => x.syncedLyrics)
    .map((x) => {
      const aMatch = normalize(x.artistName).includes(artistN) ? 2 : 0;
      const tMatch = normalize(x.trackName).includes(titleN) ? 2 : 0;
      const durDiff = Math.abs((x.duration ?? 0) - (duration ?? 0));
      const durScore = durDiff < 5 ? 3 : durDiff < 20 ? 1 : 0;
      return { x, score: aMatch + tMatch + durScore };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.x.syncedLyrics ?? null;
}

// Pick the N most-repeated short lines (≤ 6 words).
// Returns [{ text, occurrences: [t,…], length }], sorted by repeat count desc.
function findRepeatedLines(lrcLines) {
  const buckets = new Map();
  for (const { t, text } of lrcLines) {
    const n = normalize(text);
    const wordCount = n.split(" ").length;
    if (wordCount < 2 || wordCount > 7) continue;
    if (!buckets.has(n)) buckets.set(n, { display: text, times: [] });
    buckets.get(n).times.push(t);
  }
  return [...buckets.entries()]
    .map(([norm, { display, times }]) => ({
      norm,
      display,
      times,
      occurrences: times.length,
    }))
    .filter((x) => x.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences || a.times[0] - b.times[0]);
}

// Build a contiguous block of lines starting at a given timestamp.
// Returns up to `maxLines` LRC texts that appear consecutively within `maxGap` seconds.
// Aggressively extends to hit a minimum line count so "sing along" always has
// at least ~3-4 lines to make the prompt meaningful.
function blockStartingAt(lrcLines, startT, maxLines = 6, maxGap = 14) {
  const idx = lrcLines.findIndex((l) => Math.abs(l.t - startT) < 0.5);
  if (idx < 0) return [];
  const out = [lrcLines[idx].text];
  for (let i = idx + 1; i < lrcLines.length && out.length < maxLines; i++) {
    const gap = lrcLines[i].t - lrcLines[i - 1].t;
    if (gap > maxGap) break;
    // skip blank/placeholder-only lines (♪, instrumental markers)
    const txt = lrcLines[i].text.trim();
    if (!txt || /^[♪()\[\]-\s]+$/.test(txt)) continue;
    out.push(txt);
  }
  // If we ended up with < 3 lines, try again with a much wider gap tolerance
  if (out.length < 3) {
    const extended = [lrcLines[idx].text];
    for (let i = idx + 1; i < lrcLines.length && extended.length < 4; i++) {
      const txt = lrcLines[i].text.trim();
      if (!txt || /^[♪()\[\]-\s]+$/.test(txt)) continue;
      if (lrcLines[i].t - startT > 30) break;
      extended.push(txt);
    }
    return extended.length > out.length ? extended : out;
  }
  return out;
}

// Normalized-text overlap between two line arrays (Jaccard-like).
function linesOverlap(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((l) => normalize(l)));
  const setB = new Set(b.map((l) => normalize(l)));
  let intersect = 0;
  for (const x of setA) if (setB.has(x)) intersect++;
  const union = new Set([...setA, ...setB]).size;
  return intersect / union;
}

// Generate sing_along with two DIFFERENT parts of the song — guaranteed
// separate enough that students sing two distinct sections.
function generateSingAlong(lrcLines) {
  const repeats = findRepeatedLines(lrcLines);
  if (repeats.length === 0) return null;

  const first = repeats[0];
  const firstLines = blockStartingAt(lrcLines, first.times[0], 4, 6);
  const firstStart = Math.floor(first.times[0]);
  const firstEnd = firstStart + 20; // rough end of block

  const prompts = [
    {
      label_en: "Sing with the chorus",
      label_pt: "Cante junto no refrão",
      lines: firstLines,
      start_seconds: firstStart,
      style: "chorus",
    },
  ];

  // Build candidates for the second prompt, then pick the best one that:
  //   a) starts at least 30s after the first block
  //   b) has lines overlap < 50% with first block
  const candidates = [];

  // 1) Every OTHER repeated line (different norm), first occurrence
  for (const r of repeats) {
    if (r.norm === first.norm) continue;
    const block = blockStartingAt(lrcLines, r.times[0], 4, 6);
    candidates.push({
      timeSec: Math.floor(r.times[0]),
      block,
      style: "hook",
      labelEn: "Echo the hook",
      labelPt: "Repita o gancho",
    });
  }

  // 2) Every LATER occurrence of the first line (different chorus repetition)
  for (let i = 1; i < first.times.length; i++) {
    const t = first.times[i];
    const block = blockStartingAt(lrcLines, t, 4, 6);
    candidates.push({
      timeSec: Math.floor(t),
      block,
      style: "chorus",
      labelEn: "Sing it again — final chorus",
      labelPt: "Cante de novo — refrão final",
    });
  }

  // 3) Lines from the start of the song (verse 1) that aren't in the chorus
  for (const { t, text } of lrcLines) {
    if (t > firstStart - 10) break;
    const w = text.split(/\s+/).length;
    if (w < 3 || w > 8) continue;
    const block = blockStartingAt(lrcLines, t, 4, 8);
    candidates.push({
      timeSec: Math.floor(t),
      block,
      style: "verse",
      labelEn: "Sing the opening verse",
      labelPt: "Cante a abertura",
    });
    break;
  }

  // Pick the best candidate with < 50% overlap and 30s+ separation.
  let best = null;
  for (const c of candidates) {
    if (c.block.length === 0) continue;
    const separated = Math.abs(c.timeSec - firstStart) >= 30;
    const overlap = linesOverlap(c.block, firstLines);
    if (overlap < 0.5 && separated) {
      best = c;
      break;
    }
  }
  // Relaxed fallback: any candidate with at least 20s separation
  if (!best) {
    for (const c of candidates) {
      if (c.block.length === 0) continue;
      if (Math.abs(c.timeSec - firstStart) >= 20) {
        best = c;
        break;
      }
    }
  }

  if (best) {
    prompts.push({
      label_en: best.labelEn,
      label_pt: best.labelPt,
      lines: best.block,
      start_seconds: best.timeSec,
      style: best.style,
    });
  }

  return { prompts };
}

// Pick a line that contains a salient noun/verb (≥ 5 chars, not super-common)
// and turn it into a listen_and_fill exercise with that word as the blank.
const STOPWORDS = new Set([
  "the",
  "and",
  "but",
  "for",
  "with",
  "you",
  "your",
  "that",
  "this",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "not",
  "from",
  "into",
  "all",
  "will",
  "can",
  "would",
  "could",
  "about",
  "when",
  "then",
  "what",
  "where",
  "who",
  "why",
  "how",
  "just",
  "like",
  "love",
]);

// Pick a short, stand-alone line (3–7 words) for translation drill.
function generateTranslateLine(lrcLines) {
  for (const { text } of lrcLines) {
    const clean = text.replace(/[()[\]]/g, "").trim();
    const words = clean.split(/\s+/);
    if (words.length < 3 || words.length > 7) continue;
    if (clean.length < 10 || clean.length > 50) continue;
    // prefer first-person lines
    if (!/\b(i|i'm|we|we're|you|you're)\b/i.test(clean)) continue;
    return {
      type: "translate_line",
      prompt_en: "Translate this line to Portuguese:",
      prompt_pt: "Traduza esta linha para português:",
      excerpt: clean,
      model_answer_pt: "",
      teacher_note:
        "Auto-generated from synced lyrics — add the model translation when reviewing.",
    };
  }
  return null;
}

// Varied discussion prompt. Rotates through a bank of template questions keyed
// by a simple hash of the slug so each song gets a stable but different prompt.
function generateDiscussion(song) {
  const templates = [
    {
      en: (s) =>
        `"${s.title}" was released in ${s.year}. Do you think the themes in the song are timeless, or do they feel dated? Give one example from the lyrics.`,
      pt: (s) =>
        `"${s.title}" foi lançada em ${s.year}. Você acha que os temas da música são atemporais ou já parecem datados? Dê um exemplo do que ouviu.`,
    },
    {
      en: (s) =>
        `If you could ask ${s.artist} one question about "${s.title}", what would it be and why?`,
      pt: (s) =>
        `Se você pudesse perguntar uma coisa para ${s.artist} sobre "${s.title}", o que seria e por quê?`,
    },
    {
      en: (s) =>
        `Describe the mood of "${s.title}" in three adjectives. What part of the song makes you feel that way?`,
      pt: (s) =>
        `Descreva o clima de "${s.title}" em três adjetivos. Que parte da música te faz sentir isso?`,
    },
    {
      en: (s) =>
        `Imagine you are making a short film with "${s.title}" as the soundtrack. What scene would you show while the chorus plays?`,
      pt: (s) =>
        `Imagine que você vai fazer um curta com "${s.title}" como trilha sonora. Que cena você mostraria no momento do refrão?`,
    },
    {
      en: (s) =>
        `Rewrite the chorus of "${s.title}" in your own words — keep the meaning but change the style (formal, slang, poetic, whatever you like).`,
      pt: (s) =>
        `Reescreva o refrão de "${s.title}" com suas palavras — mantenha o sentido mas mude o estilo (formal, gíria, poético, o que preferir).`,
    },
    {
      en: (s) =>
        `Who in your life would you dedicate "${s.title}" to, and what line captures what you want to say to them?`,
      pt: (s) =>
        `Para quem da sua vida você dedicaria "${s.title}", e qual verso resume o que você quer dizer para essa pessoa?`,
    },
    {
      en: (s) =>
        `The singer makes a claim or statement in this song. Do you agree with it? Use evidence from the lyrics to support your answer.`,
      pt: (s) =>
        `O cantor faz uma afirmação nessa música. Você concorda? Use pelo menos um verso para defender sua resposta.`,
    },
    {
      en: (s) =>
        `If you had to summarize "${s.title}" in one sentence to someone who has never heard it, what would you say?`,
      pt: (s) =>
        `Se você tivesse que resumir "${s.title}" em uma frase para alguém que nunca ouviu, o que diria?`,
    },
    {
      en: (s) =>
        `Compare "${s.title}" with a Brazilian song you know. Do they share a theme? How do their styles differ?`,
      pt: (s) =>
        `Compare "${s.title}" com alguma música brasileira que você conhece. Elas compartilham algum tema? Como os estilos diferem?`,
    },
    {
      en: (s) =>
        `Which single word from this song do you think carries the most emotional weight, and why?`,
      pt: (s) =>
        `Qual palavra dessa música carrega mais peso emocional para você, e por quê?`,
    },
  ];
  let hash = 0;
  for (const c of song.slug) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const tpl = templates[hash % templates.length];
  return {
    type: "discussion",
    prompt_en: tpl.en(song),
    prompt_pt: tpl.pt(song),
    target_vocab: song.vocab_hooks.slice(0, 4).map((v) => v.term),
  };
}

// Match EN vocab to PT translations — pulled from the song's own vocab_hooks.
function generateWordToMeaning(song) {
  const pairs = song.vocab_hooks.slice(0, 4).map((v) => ({
    en: v.term,
    pt: v.pt,
  }));
  if (pairs.length < 3) return null;
  return {
    type: "word_to_meaning",
    prompt_en: "Match each English word or phrase to its Portuguese meaning.",
    prompt_pt: "Associe cada palavra ou expressão em inglês ao significado em português.",
    pairs,
  };
}

// Take a short line and shuffle its words. Student reconstructs the order.
function generateUnscramble(lrcLines) {
  for (const { t, text } of lrcLines) {
    const clean = text.replace(/[()[\]]/g, "").trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 4 || words.length > 7) continue;
    if (clean.length < 12 || clean.length > 45) continue;
    // Fisher-Yates with a fixed seed based on the text so shuffle is stable
    let seed = 0;
    for (const c of clean) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed / 0xffffffff;
    };
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Ensure the shuffled order differs from the original
    if (shuffled.join(" ") === words.join(" ")) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return {
      type: "unscramble_line",
      prompt_en: "Put the words in the right order:",
      prompt_pt: "Coloque as palavras na ordem certa:",
      shuffled,
      answer: words,
      youtube_start: Math.max(0, Math.floor(t)),
    };
  }
  return null;
}

// Easier listen-and-fill variant with 4 options. Picks a content word.
function generateClozeMultiChoice(lrcLines) {
  for (const { t, text } of lrcLines) {
    const words = text.split(/\s+/);
    if (words.length < 4 || words.length > 9) continue;
    for (let i = 1; i < words.length - 1; i++) {
      const raw = words[i];
      const clean = raw.replace(/[^a-zA-Z-]/g, "").toLowerCase();
      if (clean.length < 4) continue;
      if (STOPWORDS.has(clean)) continue;
      // Build 3 distractors from nearby LRC lines
      const distractors = new Set();
      for (const { text: otherText } of lrcLines) {
        if (distractors.size >= 6) break;
        for (const ow of otherText.split(/\s+/)) {
          const oc = ow.replace(/[^a-zA-Z-]/g, "").toLowerCase();
          if (
            oc.length >= 4 &&
            oc !== clean &&
            !STOPWORDS.has(oc) &&
            Math.abs(oc.length - clean.length) <= 3
          ) {
            distractors.add(oc);
          }
        }
      }
      const distArr = [...distractors].slice(0, 3);
      if (distArr.length < 3) continue;
      const options = [clean, ...distArr].sort();
      const answer_index = options.indexOf(clean);
      return {
        type: "cloze_multi_choice",
        prompt_en: "Choose the missing word:",
        prompt_pt: "Escolha a palavra que falta:",
        excerpt_before: words.slice(0, i).join(" "),
        excerpt_after: words.slice(i + 1).join(" "),
        options,
        answer_index,
        youtube_start: Math.max(0, Math.floor(t)),
        youtube_end: Math.floor(t) + 12,
      };
    }
  }
  return null;
}

// Count how often a key word appears in the LRC lyrics.
function generateCountWord(lrcLines, song) {
  const tallies = new Map();
  for (const { text } of lrcLines) {
    const tokens = text.toLowerCase().match(/[a-z][a-z']+/g) ?? [];
    for (const tok of tokens) {
      if (tok.length < 4) continue;
      if (STOPWORDS.has(tok)) continue;
      tallies.set(tok, (tallies.get(tok) ?? 0) + 1);
    }
  }
  // Prefer a word from vocab_hooks if it actually appears enough
  for (const v of song.vocab_hooks) {
    const key = v.term.toLowerCase().replace(/[^a-z']+/g, "");
    if ((tallies.get(key) ?? 0) >= 3) {
      return {
        type: "count_word",
        prompt_en: `How many times do you hear the word "${v.term}" in the whole song?`,
        prompt_pt: `Quantas vezes você ouve a palavra "${v.term}" na música inteira?`,
        word: v.term,
        answer: tallies.get(key),
      };
    }
  }
  // Fallback: most-repeated content word
  const [top] = [...tallies.entries()].sort((a, b) => b[1] - a[1]);
  if (top && top[1] >= 3) {
    return {
      type: "count_word",
      prompt_en: `How many times do you hear the word "${top[0]}" in the whole song?`,
      prompt_pt: `Quantas vezes você ouve a palavra "${top[0]}" na música inteira?`,
      word: top[0],
      answer: top[1],
    };
  }
  return null;
}

// Put three distinct excerpts in chronological order.
function generateLineOrder(lrcLines) {
  // Pick 3 lines evenly spaced across the song
  const usable = lrcLines.filter((l) => {
    const w = l.text.split(/\s+/).length;
    return w >= 3 && w <= 8 && !/^[♪()\[\]-\s]+$/.test(l.text);
  });
  if (usable.length < 6) return null;
  const step = Math.floor(usable.length / 3);
  const picks = [usable[0], usable[step], usable[step * 2]];
  // Validate all three are different
  const texts = new Set(picks.map((p) => p.text));
  if (texts.size < 3) return null;
  const excerpts = picks.map((p, i) => ({ text: p.text, order: i }));
  return {
    type: "line_order",
    prompt_en: "Put these three lines in the order they appear in the song:",
    prompt_pt: "Coloque estes três versos na ordem em que aparecem na música:",
    excerpts,
  };
}

// Find contractions in the lyrics (short form + expand). Always safe — the
// map of contractions is language-general, not song-specific.
const CONTRACTION_MAP = {
  "i'm": "I am",
  "i've": "I have",
  "i'll": "I will",
  "i'd": "I would",
  "you're": "you are",
  "you've": "you have",
  "you'll": "you will",
  "you'd": "you would",
  "we're": "we are",
  "we've": "we have",
  "we'll": "we will",
  "they're": "they are",
  "they've": "they have",
  "they'll": "they will",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "that's": "that is",
  "what's": "what is",
  "who's": "who is",
  "there's": "there is",
  "let's": "let us",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "couldn't": "could not",
  "won't": "will not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  gonna: "going to",
  wanna: "want to",
  gotta: "got to",
};

function generateSpotTheGrammar(lrcLines) {
  const hits = new Set();
  for (const { text } of lrcLines) {
    const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
    for (const tok of tokens) {
      if (CONTRACTION_MAP[tok]) hits.add(tok);
      if (hits.size >= 4) break;
    }
    if (hits.size >= 4) break;
  }
  if (hits.size < 2) return null;
  return {
    type: "spot_the_grammar",
    prompt_en: "Write the full form of each contraction:",
    prompt_pt: "Escreva a forma completa de cada contração:",
    expected: [...hits].slice(0, 6).map((short) => ({
      short,
      full: CONTRACTION_MAP[short],
    })),
  };
}

function generateListenAndFill(lrcLines) {
  for (const { t, text } of lrcLines) {
    const words = text.split(/\s+/);
    if (words.length < 4 || words.length > 9) continue;
    for (let i = 1; i < words.length - 1; i++) {
      const raw = words[i];
      const clean = raw.replace(/[^a-zA-Z-]/g, "").toLowerCase();
      if (clean.length < 5) continue;
      if (STOPWORDS.has(clean)) continue;
      const before = words.slice(0, i).join(" ");
      const after = words.slice(i + 1).join(" ");
      return {
        type: "listen_and_fill",
        prompt_en: "Fill the blank in this line:",
        prompt_pt: "Complete a lacuna neste verso:",
        excerpt_before: before,
        blank_hint: `word starting with "${clean[0]}"`,
        answer: clean,
        excerpt_after: after,
        youtube_start: Math.max(0, Math.floor(t)),
        youtube_end: Math.floor(t) + 14,
      };
    }
  }
  return null;
}

async function enrichSong(slug, { force }) {
  const filePath = path.join(SONGS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  skip ${slug} — no file`);
    return;
  }
  const song = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const hasSingAlong = !!song.sing_along?.prompts?.length;
  const hasExercises = !!(song.exercises && song.exercises.length > 0);
  if (!force && hasSingAlong && hasExercises) {
    console.log(`  ${slug}: already enriched`);
    return;
  }

  const lrcText = await fetchLrc({
    artist: song.artist,
    title: song.title,
    album: song.album,
    duration: song.duration_seconds,
  });
  if (!lrcText) {
    console.log(`  ${slug}: NO LRCLIB match`);
    return;
  }
  const lrcLines = parseLrc(lrcText);
  if (lrcLines.length === 0) {
    console.log(`  ${slug}: empty LRC`);
    return;
  }

  let changed = false;

  if (force || !hasSingAlong) {
    const sa = generateSingAlong(lrcLines);
    if (sa) {
      song.sing_along = sa;
      changed = true;
      console.log(
        `  ${slug}: sing_along + ${sa.prompts.length} prompt${sa.prompts.length === 1 ? "" : "s"}`
      );
    }
  }

  // Exercise set: ensure each of the 4 types exists. Only add a type if it's
  // missing (or if --force clears them first).
  if (force) song.exercises = [];
  song.exercises = song.exercises || [];
  const existing = new Set(song.exercises.map((e) => e.type));

  if (!existing.has("listen_and_fill")) {
    const ex = generateListenAndFill(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + listen_and_fill @ ${ex.youtube_start}s`);
    }
  }
  if (!existing.has("translate_line")) {
    const ex = generateTranslateLine(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + translate_line`);
    }
  }
  if (!existing.has("spot_the_grammar")) {
    const ex = generateSpotTheGrammar(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(
        `  ${slug}: + spot_the_grammar (${ex.expected.length} contractions)`
      );
    }
  }
  if (!existing.has("discussion")) {
    const ex = generateDiscussion(song);
    song.exercises.push(ex);
    changed = true;
    console.log(`  ${slug}: + discussion`);
  }
  if (!existing.has("word_to_meaning")) {
    const ex = generateWordToMeaning(song);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + word_to_meaning (${ex.pairs.length})`);
    }
  }
  if (!existing.has("unscramble_line")) {
    const ex = generateUnscramble(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + unscramble_line (${ex.answer.length} words)`);
    }
  }
  if (!existing.has("cloze_multi_choice")) {
    const ex = generateClozeMultiChoice(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + cloze_multi_choice`);
    }
  }
  if (!existing.has("count_word")) {
    const ex = generateCountWord(lrcLines, song);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + count_word ("${ex.word}" × ${ex.answer})`);
    }
  }
  if (!existing.has("line_order")) {
    const ex = generateLineOrder(lrcLines);
    if (ex) {
      song.exercises.push(ex);
      changed = true;
      console.log(`  ${slug}: + line_order`);
    }
  }

  // Mark provenance of timings
  song.timing_source = "lrclib";

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(song, null, 2) + "\n");
  }
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlySlug = args.find((a) => !a.startsWith("--"));

const files = fs
  .readdirSync(SONGS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.basename(f, ".json"));

const targets = onlySlug ? files.filter((f) => f === onlySlug) : files;
console.log(
  `Enriching ${targets.length} song(s) via LRCLIB${force ? " [FORCE]" : ""}…`
);
for (const slug of targets) {
  try {
    await enrichSong(slug, { force });
  } catch (err) {
    console.log(`  ${slug}: ERROR ${err.message}`);
  }
}
console.log("\nDone.");
