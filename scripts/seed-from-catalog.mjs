#!/usr/bin/env node
// Bulk-seed songs from scripts/content/catalog-500.json by querying LRCLIB for
// each entry, then building the full song JSON (metadata + sing_along + ~30
// exercises) via the shared helpers in ./enrich-music.mjs.
//
// Usage:
//   node scripts/seed-from-catalog.mjs                      # seed all (skip existing)
//   node scripts/seed-from-catalog.mjs --force              # overwrite existing
//   node scripts/seed-from-catalog.mjs --limit 20           # just first 20
//   node scripts/seed-from-catalog.mjs --offset 100 --limit 50
//   node scripts/seed-from-catalog.mjs --dry                # don't write files

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchLrc,
  parseLrc,
  generateSingAlong,
  buildExerciseSet,
} from "./enrich-music.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.resolve(__dirname, "content", "catalog-500.json");
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");

const STOPWORDS = new Set([
  "the","and","but","for","with","you","your","that","this","are","was","were",
  "have","has","had","not","from","into","all","will","can","would","could",
  "about","when","then","what","where","who","why","how","just","like","love",
  "now","one","two","get","got","its","our","their","out","off","too","very",
  "some","any","him","her","his","she","they","them","been","being","also",
  "only","more","most","less","than","take","make","made","said","see","come",
  "back","down","here","over","still","away","around","before","after","again",
  "even","much","once","must","look","looked","gonna","wanna","gotta","yeah",
  "ooh","oh","la","na","hey","ah","woah","whoa",
]);

function slugify(title, artist) {
  const base = title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length === 0) {
    return (
      artist
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-") + "-song"
    );
  }
  return base;
}

function letrasSlug(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function letrasUrl(artist, title) {
  const a = letrasSlug(artist);
  const t = letrasSlug(title);
  if (!a || !t) return "";
  return `https://www.letras.mus.br/${a}/${t}/`;
}

function difficultyFromCefr(cefr) {
  if (!cefr) return "easy";
  const c = cefr.toLowerCase();
  if (c.startsWith("a1") || c.startsWith("a2")) return "easy";
  if (c.startsWith("b1")) return "medium";
  return "hard";
}

function tempoFromLrc(lrcLines, durationSec) {
  if (!lrcLines || lrcLines.length === 0 || !durationSec) return "mid";
  const lpm = (lrcLines.length / durationSec) * 60;
  if (lpm > 22) return "fast";
  if (lpm < 10) return "slow";
  return "mid";
}

// Build vocab_hooks from LRC content: top repeated uncommon content words.
function extractVocabHooks(lrcLines, maxN = 5) {
  const tallies = new Map();
  const firstLine = new Map();
  for (const { text } of lrcLines) {
    const tokens = text.toLowerCase().match(/[a-z][a-z']+/g) ?? [];
    for (const tok of tokens) {
      if (tok.length < 4) continue;
      if (STOPWORDS.has(tok)) continue;
      tallies.set(tok, (tallies.get(tok) ?? 0) + 1);
      if (!firstLine.has(tok)) firstLine.set(tok, text);
    }
  }
  const ranked = [...tallies.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, maxN).map(([term]) => ({
    term,
    pt: "",
    note: "",
  }));
}

function ensureUniqueSlug(baseSlug, artist, existing) {
  let slug = baseSlug;
  let n = 1;
  const artistSlug = artist
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  while (existing.has(slug)) {
    slug = `${baseSlug}-${artistSlug}`;
    if (!existing.has(slug)) break;
    n += 1;
    slug = `${baseSlug}-${artistSlug}-${n}`;
  }
  return slug;
}

async function seedWithSlug(entry, slug, { force, dry }) {
  const filePath = path.join(SONGS_DIR, `${slug}.json`);

  if (fs.existsSync(filePath) && !force) {
    return { slug, status: "exists" };
  }

  const lrc = await fetchLrc({
    artist: entry.artist,
    title: entry.title,
  });
  if (!lrc) return { slug, status: "no-lrclib" };
  const lrcLines = parseLrc(lrc.syncedLyrics);
  if (lrcLines.length < 8) return { slug, status: "short-lrc" };

  const duration = lrc.meta?.duration ?? 0;
  const album = lrc.meta?.albumName ?? "";

  const song = {
    slug,
    title: entry.title,
    artist: entry.artist,
    year: entry.year,
    album,
    genre: entry.genre ?? [],
    cefr_level: entry.cefr ?? "a2.1",
    difficulty: difficultyFromCefr(entry.cefr),
    tempo: tempoFromLrc(lrcLines, duration),
    duration_seconds: duration,
    youtube_id: "",
    full_lyrics_url: letrasUrl(entry.artist, entry.title),
    full_lyrics_source: "Letras.mus.br (licensed)",
    why_this_song: `${entry.title} by ${entry.artist} (${entry.year}) — selected for the English-through-music catalog. Use the sing-along prompts and exercises to drill pronunciation, vocabulary, and listening comprehension.`,
    vocab_hooks: extractVocabHooks(lrcLines),
    grammar_callouts: [],
    timing_source: "lrclib",
    teaching_notes_md: `## Teaching notes\n\n- Times are estimated from community-synced lyrics and may be off by 1–2 seconds.\n- Start with the sing-along prompt, then move to listen-and-fill.\n- For B1+ students, focus on the discussion questions.\n`,
    copyright_notice:
      "Short fair-use lyric excerpts only (Brazilian Lei 9.610/98 art. 46 VIII). No full lyrics stored.",
  };

  const sa = generateSingAlong(lrcLines);
  if (sa) song.sing_along = sa;
  song.exercises = buildExerciseSet(song, lrcLines);

  if (!dry) {
    fs.writeFileSync(filePath, JSON.stringify(song, null, 2) + "\n");
  }
  return {
    slug,
    status: "ok",
    exerciseCount: song.exercises.length,
    saPrompts: sa?.prompts?.length ?? 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dry = args.includes("--dry");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const offsetArg = args.find((a) => a.startsWith("--offset="));
  const concArg = args.find((a) => a.startsWith("--conc="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
  const offset = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
  const concurrency = concArg ? Number(concArg.split("=")[1]) : 6;

  const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const songs = raw.songs ?? raw;
  const slice = songs.slice(offset, offset + limit);
  console.log(
    `Seeding ${slice.length} entries (offset=${offset}, conc=${concurrency}, force=${force}, dry=${dry})…`
  );

  const existing = new Set(
    fs
      .readdirSync(SONGS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
  );

  // Pre-reserve slugs so parallel workers don't collide on dedupe.
  const reservedSlugs = new Set(existing);
  const plan = slice.map((entry) => {
    const base = slugify(entry.title, entry.artist);
    const slug = force
      ? base
      : ensureUniqueSlug(base, entry.artist, reservedSlugs);
    reservedSlugs.add(slug);
    return { entry, slug };
  });

  const stats = {
    ok: 0,
    exists: 0,
    "no-lrclib": 0,
    "short-lrc": 0,
    errored: 0,
  };
  const failures = [];
  let cursor = 0;
  let completed = 0;

  async function worker(id) {
    while (true) {
      const idx = cursor++;
      if (idx >= plan.length) break;
      const { entry, slug } = plan[idx];
      try {
        const res = await seedWithSlug(entry, slug, { force, dry });
        if (res.status === "ok") {
          stats.ok += 1;
        } else {
          stats[res.status] = (stats[res.status] ?? 0) + 1;
          if (res.status === "no-lrclib") {
            failures.push(`${entry.artist} — ${entry.title}`);
          }
        }
      } catch (err) {
        stats.errored += 1;
        console.log(`  ERR ${entry.artist} / ${entry.title}: ${err.message}`);
      }
      completed += 1;
      if (completed % 50 === 0 || completed === plan.length) {
        console.log(
          `  [${completed}/${plan.length}] ok=${stats.ok} exists=${stats.exists} miss=${stats["no-lrclib"]} short=${stats["short-lrc"]} err=${stats.errored}`
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, (_, i) => worker(i))
  );

  console.log("\nSummary:");
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
  if (failures.length) {
    const fpath = path.resolve(__dirname, "content", "seed-failures.txt");
    fs.writeFileSync(fpath, failures.join("\n") + "\n");
    console.log(
      `\n${failures.length} LRCLIB miss(es) logged to ${path.relative(process.cwd(), fpath)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
