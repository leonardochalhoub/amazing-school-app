#!/usr/bin/env node
// Enriches song JSON files with LRCLIB-sourced sing_along prompts and a rich
// exercise set (~30 items per song). All lyric text comes from LRCLIB's
// community-curated synced-lyrics API — no hard-coded lyrics in this repo's
// authored content, only short fair-use excerpts pulled at script-run time.
//
// Usage:
//   node scripts/enrich-music.mjs              # all songs missing sing_along or exercises
//   node scripts/enrich-music.mjs --force      # re-enrich everything, overwriting
//   node scripts/enrich-music.mjs <slug>       # one song
//
// Also exported as a library so scripts/seed-from-catalog.mjs can reuse the
// LRCLIB fetching and exercise-generation logic on freshly-seeded songs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");
const USER_AGENT =
  "amazing-school-app/0.2 (English teaching platform; +lrclib enrich)";

// ----------------------------------------------------------------------------
// LRCLIB
// ----------------------------------------------------------------------------

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLrc(lrcText) {
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

export async function fetchLrc({ artist, title, album, duration }) {
  const tryParams = (includeAlbum) => {
    const p = new URLSearchParams({ artist_name: artist, track_name: title });
    if (includeAlbum && album) p.set("album_name", album);
    if (duration) p.set("duration", String(duration));
    return p;
  };
  for (const includeAlbum of [true, false]) {
    const url = `https://lrclib.net/api/get?${tryParams(includeAlbum)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
    const json = await res.json();
    if (json.syncedLyrics) {
      return { syncedLyrics: json.syncedLyrics, meta: json };
    }
  }
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
      const durScore = !duration ? 1 : durDiff < 5 ? 3 : durDiff < 20 ? 1 : 0;
      return { x, score: aMatch + tMatch + durScore };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  return { syncedLyrics: best.x.syncedLyrics, meta: best.x };
}

// ----------------------------------------------------------------------------
// Sing-along
// ----------------------------------------------------------------------------

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

function blockStartingAt(lrcLines, startT, maxLines = 6, maxGap = 14) {
  const idx = lrcLines.findIndex((l) => Math.abs(l.t - startT) < 0.5);
  if (idx < 0) return [];
  const out = [lrcLines[idx].text];
  for (let i = idx + 1; i < lrcLines.length && out.length < maxLines; i++) {
    const gap = lrcLines[i].t - lrcLines[i - 1].t;
    if (gap > maxGap) break;
    const txt = lrcLines[i].text.trim();
    if (!txt || /^[♪()\[\]-\s]+$/.test(txt)) continue;
    out.push(txt);
  }
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

function linesOverlap(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((l) => normalize(l)));
  const setB = new Set(b.map((l) => normalize(l)));
  let intersect = 0;
  for (const x of setA) if (setB.has(x)) intersect++;
  const union = new Set([...setA, ...setB]).size;
  return intersect / union;
}

export function generateSingAlong(lrcLines) {
  const repeats = findRepeatedLines(lrcLines);
  if (repeats.length === 0) return null;

  const first = repeats[0];
  const firstLines = blockStartingAt(lrcLines, first.times[0], 4, 6);
  const firstStart = Math.floor(first.times[0]);

  const prompts = [
    {
      label_en: "Sing with the chorus",
      label_pt: "Cante junto no refrão",
      lines: firstLines,
      start_seconds: firstStart,
      style: "chorus",
    },
  ];

  const candidates = [];
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

// ----------------------------------------------------------------------------
// Exercise generators — each returns an ARRAY of exercises (up to `max` items).
// ----------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the","and","but","for","with","you","your","that","this","are","was","were",
  "have","has","had","not","from","into","all","will","can","would","could",
  "about","when","then","what","where","who","why","how","just","like","love",
  "now","one","two","get","got","its","our","their","out","off","too","why",
  "some","any","him","her","his","she","they","them","were","been","being",
  "very","also","only","more","most","less","than","take","make","made","said",
  "say","see","saw","come","came","back","down","here","over","upon","still",
  "away","around","before","after","again","even","much","once","must","look",
  "looked","looks",
]);

function isUsableLine(text) {
  const t = text.trim();
  if (!t) return false;
  if (/^[♪()\[\]\-\s]+$/.test(t)) return false;
  return true;
}

// Pick N items evenly spaced from an array of candidates.
function spaceOut(arr, n) {
  if (arr.length <= n) return arr;
  const out = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

export function generateListenAndFillAll(lrcLines, max = 6) {
  const candidates = [];
  const usedAnswers = new Set();
  for (const { t, text } of lrcLines) {
    if (!isUsableLine(text)) continue;
    const words = text.split(/\s+/);
    if (words.length < 4 || words.length > 9) continue;
    for (let i = 1; i < words.length - 1; i++) {
      const clean = words[i].replace(/[^a-zA-Z-]/g, "").toLowerCase();
      if (clean.length < 5) continue;
      if (STOPWORDS.has(clean)) continue;
      if (usedAnswers.has(clean)) continue;
      usedAnswers.add(clean);
      candidates.push({
        type: "listen_and_fill",
        prompt_en: "Fill the blank in this line:",
        prompt_pt: "Complete a lacuna neste verso:",
        excerpt_before: words.slice(0, i).join(" "),
        blank_hint: `word starting with "${clean[0]}"`,
        answer: clean,
        excerpt_after: words.slice(i + 1).join(" "),
        youtube_start: Math.max(0, Math.floor(t)),
        youtube_end: Math.floor(t) + 14,
      });
      break;
    }
  }
  return spaceOut(candidates, max);
}

export function generateTranslateLineAll(lrcLines, max = 5) {
  const candidates = [];
  const seen = new Set();
  for (const { text } of lrcLines) {
    if (!isUsableLine(text)) continue;
    const clean = text.replace(/[()[\]]/g, "").trim();
    const words = clean.split(/\s+/);
    if (words.length < 3 || words.length > 8) continue;
    if (clean.length < 10 || clean.length > 55) continue;
    const n = normalize(clean);
    if (seen.has(n)) continue;
    seen.add(n);
    const score = /\b(i|i'm|i've|we|we're|you|you're|they|he|she)\b/i.test(clean)
      ? 2
      : 1;
    candidates.push({
      score,
      ex: {
        type: "translate_line",
        prompt_en: "Translate this line to Portuguese:",
        prompt_pt: "Traduza esta linha para português:",
        excerpt: clean,
        model_answer_pt: "",
        teacher_note:
          "Auto-generated from synced lyrics — add the model translation when reviewing.",
      },
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const topHalf = candidates.slice(0, Math.max(max * 2, 10));
  return spaceOut(topHalf, max).map((c) => c.ex);
}

// Deterministic shuffle helper.
function stableShuffle(arr, seedStr) {
  let seed = 0;
  for (const c of seedStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 0xffffffff;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateUnscrambleAll(lrcLines, max = 5) {
  const candidates = [];
  const seen = new Set();
  for (const { t, text } of lrcLines) {
    if (!isUsableLine(text)) continue;
    const clean = text.replace(/[()[\]]/g, "").trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 4 || words.length > 7) continue;
    if (clean.length < 12 || clean.length > 50) continue;
    const n = normalize(clean);
    if (seen.has(n)) continue;
    seen.add(n);
    const shuffled = stableShuffle(words, clean);
    if (shuffled.join(" ") === words.join(" ")) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    candidates.push({
      type: "unscramble_line",
      prompt_en: "Put the words in the right order:",
      prompt_pt: "Coloque as palavras na ordem certa:",
      shuffled,
      answer: words,
      youtube_start: Math.max(0, Math.floor(t)),
    });
  }
  return spaceOut(candidates, max);
}

export function generateClozeMultiChoiceAll(lrcLines, max = 5) {
  const candidates = [];
  const usedAnswers = new Set();
  // Build a pool of content words for distractors.
  const pool = new Set();
  for (const { text } of lrcLines) {
    for (const w of text.split(/\s+/)) {
      const c = w.replace(/[^a-zA-Z-]/g, "").toLowerCase();
      if (c.length >= 4 && !STOPWORDS.has(c)) pool.add(c);
    }
  }
  const poolArr = [...pool];

  for (const { t, text } of lrcLines) {
    if (!isUsableLine(text)) continue;
    const words = text.split(/\s+/);
    if (words.length < 4 || words.length > 9) continue;
    for (let i = 1; i < words.length - 1; i++) {
      const clean = words[i].replace(/[^a-zA-Z-]/g, "").toLowerCase();
      if (clean.length < 4) continue;
      if (STOPWORDS.has(clean)) continue;
      if (usedAnswers.has(clean)) continue;
      // Build 3 distractors from the pool, length-similar.
      const distractors = poolArr
        .filter(
          (w) => w !== clean && Math.abs(w.length - clean.length) <= 3
        )
        .slice(0, 40);
      if (distractors.length < 3) break;
      // Stable-pick 3 from distractors.
      const picked = stableShuffle(distractors, clean).slice(0, 3);
      const options = [clean, ...picked].sort();
      usedAnswers.add(clean);
      candidates.push({
        type: "cloze_multi_choice",
        prompt_en: "Choose the missing word:",
        prompt_pt: "Escolha a palavra que falta:",
        excerpt_before: words.slice(0, i).join(" "),
        excerpt_after: words.slice(i + 1).join(" "),
        options,
        answer_index: options.indexOf(clean),
        youtube_start: Math.max(0, Math.floor(t)),
        youtube_end: Math.floor(t) + 12,
      });
      break;
    }
  }
  return spaceOut(candidates, max);
}

export function generateCountWordAll(lrcLines, song, max = 2) {
  const tallies = new Map();
  for (const { text } of lrcLines) {
    const tokens = text.toLowerCase().match(/[a-z][a-z']+/g) ?? [];
    for (const tok of tokens) {
      if (tok.length < 4) continue;
      if (STOPWORDS.has(tok)) continue;
      tallies.set(tok, (tallies.get(tok) ?? 0) + 1);
    }
  }
  const out = [];
  const vocab = song.vocab_hooks ?? [];
  const seen = new Set();
  // Prefer vocab_hook words that repeat.
  for (const v of vocab) {
    if (out.length >= max) break;
    const key = v.term.toLowerCase().replace(/[^a-z']+/g, "");
    const count = tallies.get(key) ?? 0;
    if (count >= 3 && !seen.has(key)) {
      seen.add(key);
      out.push({
        type: "count_word",
        prompt_en: `How many times do you hear the word "${v.term}" in the whole song?`,
        prompt_pt: `Quantas vezes você ouve a palavra "${v.term}" na música inteira?`,
        word: v.term,
        answer: count,
      });
    }
  }
  // Fill with most-repeated content words.
  const top = [...tallies.entries()].sort((a, b) => b[1] - a[1]);
  for (const [word, count] of top) {
    if (out.length >= max) break;
    if (count < 3) break;
    if (seen.has(word)) continue;
    seen.add(word);
    out.push({
      type: "count_word",
      prompt_en: `How many times do you hear the word "${word}" in the whole song?`,
      prompt_pt: `Quantas vezes você ouve a palavra "${word}" na música inteira?`,
      word,
      answer: count,
    });
  }
  return out;
}

export function generateLineOrderAll(lrcLines, max = 2) {
  const usable = lrcLines.filter(
    (l) =>
      isUsableLine(l.text) &&
      l.text.split(/\s+/).length >= 3 &&
      l.text.split(/\s+/).length <= 8
  );
  if (usable.length < 6) return [];
  const out = [];
  // Triplet A: beginning, middle, end.
  const stepA = Math.floor(usable.length / 3);
  const picksA = [usable[0], usable[stepA], usable[stepA * 2]];
  if (new Set(picksA.map((p) => p.text)).size === 3) {
    out.push({
      type: "line_order",
      prompt_en: "Put these three lines in the order they appear in the song:",
      prompt_pt: "Coloque estes três versos na ordem em que aparecem na música:",
      excerpts: picksA.map((p, i) => ({ text: p.text, order: i })),
    });
  }
  if (out.length < max && usable.length >= 9) {
    const stepB = Math.floor(usable.length / 4);
    const picksB = [usable[1], usable[stepB * 2], usable[stepB * 3]];
    const setB = new Set(picksB.map((p) => p.text));
    const overlapA = new Set(picksA.map((p) => p.text));
    const distinct = [...setB].every((t) => !overlapA.has(t));
    if (setB.size === 3 && distinct) {
      out.push({
        type: "line_order",
        prompt_en:
          "And these three — put them in the order they appear in the song:",
        prompt_pt:
          "E estes três — coloque na ordem em que aparecem na música:",
        excerpts: picksB.map((p, i) => ({ text: p.text, order: i })),
      });
    }
  }
  return out;
}

const DISCUSSION_TEMPLATES = [
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
  {
    en: (s) =>
      `What kind of person do you imagine the narrator of "${s.title}" is? Describe their age, mood, and situation using at least three details from the lyrics.`,
    pt: (s) =>
      `Que tipo de pessoa você imagina ser o narrador de "${s.title}"? Descreva a idade, o humor e a situação usando pelo menos três detalhes da letra.`,
  },
  {
    en: (s) =>
      `If you could change the ending of the story told in "${s.title}", what would happen instead?`,
    pt: (s) =>
      `Se você pudesse mudar o final da história contada em "${s.title}", o que aconteceria?`,
  },
  {
    en: (s) =>
      `Which instrument or vocal moment in "${s.title}" stands out most to you, and what emotion does it bring?`,
    pt: (s) =>
      `Qual instrumento ou momento vocal em "${s.title}" mais se destaca para você, e que emoção ele traz?`,
  },
  {
    en: (s) =>
      `If "${s.title}" were the opening theme of a TV series, what kind of show would that be? Describe the genre, main character, and pilot episode in 2–3 sentences.`,
    pt: (s) =>
      `Se "${s.title}" fosse o tema de abertura de uma série, que tipo de série seria? Descreva o gênero, o protagonista e o episódio piloto em 2–3 frases.`,
  },
  {
    en: (s) =>
      `Pick one line from "${s.title}" that could stand on its own as a personal motto. Why did you choose that line?`,
    pt: (s) =>
      `Escolha um verso de "${s.title}" que poderia ser um lema pessoal. Por que você escolheu esse verso?`,
  },
  {
    en: (s) =>
      `Would "${s.title}" work better as a solo performance or as a duet? Who would you cast as the second voice, and why?`,
    pt: (s) =>
      `"${s.title}" funcionaria melhor como apresentação solo ou dueto? Quem você chamaria para a segunda voz, e por quê?`,
  },
  {
    en: (s) =>
      `How does the pace of "${s.title}" change from beginning to end? Is the ending more intense, calmer, or the same? Give one example.`,
    pt: (s) =>
      `Como o ritmo de "${s.title}" muda do começo ao fim? O final é mais intenso, mais calmo ou igual? Dê um exemplo.`,
  },
  {
    en: (s) =>
      `Imagine covering "${s.title}" in a completely different genre (reggae, bossa nova, heavy metal, samba…). Which genre would you choose and why?`,
    pt: (s) =>
      `Imagine regravar "${s.title}" em um gênero totalmente diferente (reggae, bossa nova, heavy metal, samba…). Qual gênero você escolheria e por quê?`,
  },
  {
    en: (s) =>
      `Teach a friend one new English word from this song. Which word would it be, how would you define it, and what example sentence would you give?`,
    pt: (s) =>
      `Ensine uma palavra nova em inglês dessa música para um amigo. Qual palavra seria, como você definiria, e que exemplo você daria?`,
  },
];

function slugHash(slug) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function generateDiscussionAll(song, max = 3) {
  const n = DISCUSSION_TEMPLATES.length;
  const start = slugHash(song.slug) % n;
  const picked = [];
  const seen = new Set();
  // Walk the full template ring (stride 1 keeps us within max=n before
  // repeating) so callers can request up to `n` unique prompts. Earlier
  // stride 3 collided with n=12 and could loop forever.
  for (let i = 0; i < n && picked.length < max; i++) {
    const tpl = DISCUSSION_TEMPLATES[(start + i) % n];
    if (seen.has(tpl)) continue;
    seen.add(tpl);
    picked.push({
      type: "discussion",
      prompt_en: tpl.en(song),
      prompt_pt: tpl.pt(song),
      target_vocab: (song.vocab_hooks ?? []).slice(0, 4).map((v) => v.term),
    });
  }
  return picked;
}

const CONTRACTION_MAP = {
  "i'm": "I am","i've": "I have","i'll": "I will","i'd": "I would",
  "you're": "you are","you've": "you have","you'll": "you will","you'd": "you would",
  "we're": "we are","we've": "we have","we'll": "we will",
  "they're": "they are","they've": "they have","they'll": "they will",
  "he's": "he is","she's": "she is","it's": "it is",
  "that's": "that is","what's": "what is","who's": "who is","there's": "there is",
  "let's": "let us",
  "don't": "do not","doesn't": "does not","didn't": "did not",
  "can't": "cannot","couldn't": "could not",
  "won't": "will not","wouldn't": "would not","shouldn't": "should not",
  "isn't": "is not","aren't": "are not","wasn't": "was not","weren't": "were not",
  "haven't": "have not","hasn't": "has not","hadn't": "had not",
  gonna: "going to", wanna: "want to", gotta: "got to",
};

export function generateSpotTheGrammar(lrcLines) {
  const hits = new Set();
  for (const { text } of lrcLines) {
    const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
    for (const tok of tokens) {
      if (CONTRACTION_MAP[tok]) hits.add(tok);
      if (hits.size >= 6) break;
    }
    if (hits.size >= 6) break;
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

export function generateWordToMeaning(song) {
  const pairs = (song.vocab_hooks ?? [])
    .filter((v) => v.pt && v.pt.length > 0)
    .slice(0, 6)
    .map((v) => ({ en: v.term, pt: v.pt }));
  if (pairs.length < 3) return null;
  return {
    type: "word_to_meaning",
    prompt_en: "Match each English word or phrase to its Portuguese meaning.",
    prompt_pt:
      "Associe cada palavra ou expressão em inglês ao significado em português.",
    pairs,
  };
}

// ----------------------------------------------------------------------------
// Orchestration — build the full exercise set (~30 items).
// ----------------------------------------------------------------------------

export function buildExerciseSet(song, lrcLines) {
  const set = [];
  const pushAll = (arr) => {
    for (const ex of arr) if (ex) set.push(ex);
  };
  pushAll(generateListenAndFillAll(lrcLines, 6));
  pushAll(generateTranslateLineAll(lrcLines, 5));
  pushAll(generateClozeMultiChoiceAll(lrcLines, 5));
  pushAll(generateUnscrambleAll(lrcLines, 5));
  pushAll(generateCountWordAll(lrcLines, song, 2));
  pushAll(generateLineOrderAll(lrcLines, 2));
  pushAll(generateDiscussionAll(song, 3));
  const stg = generateSpotTheGrammar(lrcLines);
  if (stg) set.push(stg);
  const wtm = generateWordToMeaning(song);
  if (wtm) set.push(wtm);
  // Standing rule: every song must ship with exactly 30 exercises. Top up
  // with extra discussion prompts (rotating through the full template pool)
  // when the other generators produced fewer items than their cap.
  const TARGET = 30;
  if (set.length < TARGET) {
    const extras = generateDiscussionAll(song, TARGET - set.length + 3);
    const seenText = new Set(
      set.filter((e) => e.type === "discussion").map((e) => e.prompt_en)
    );
    for (const ex of extras) {
      if (set.length >= TARGET) break;
      if (seenText.has(ex.prompt_en)) continue;
      seenText.add(ex.prompt_en);
      set.push(ex);
    }
  }
  return set.slice(0, TARGET);
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

async function enrichSong(slug, { force }) {
  const filePath = path.join(SONGS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  skip ${slug} — no file`);
    return;
  }
  const song = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const hasSingAlong = !!song.sing_along?.prompts?.length;
  const hasRichSet = !!(song.exercises && song.exercises.length >= 25);
  if (!force && hasSingAlong && hasRichSet) {
    console.log(`  ${slug}: already enriched (${song.exercises.length} ex)`);
    return;
  }

  const lrc = await fetchLrc({
    artist: song.artist,
    title: song.title,
    album: song.album,
    duration: song.duration_seconds,
  });
  if (!lrc) {
    console.log(`  ${slug}: NO LRCLIB match`);
    return;
  }
  const lrcLines = parseLrc(lrc.syncedLyrics);
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
    }
  }

  if (force || !hasRichSet) {
    song.exercises = buildExerciseSet(song, lrcLines);
    changed = true;
    console.log(`  ${slug}: ${song.exercises.length} exercises`);
  }

  song.timing_source = "lrclib";

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(song, null, 2) + "\n");
  }
}

const isDirectCli =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("enrich-music.mjs");

if (isDirectCli) {
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
}
