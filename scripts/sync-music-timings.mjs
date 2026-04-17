#!/usr/bin/env node
// Syncs `sing_along.prompts[].start_seconds` and `listen_and_fill` youtube_start
// timestamps to LRCLIB's community-curated synced-lyrics data.
//
// We only read TIMESTAMPS (e.g. [00:30.20]) from LRCLIB — the lyric text itself
// is never written to our repo. The lines in sing_along prompts are our own
// short educational excerpts (fair-use citation); LRCLIB only tells us WHEN
// each line occurs in the recording.
//
// Usage:
//   node scripts/sync-music-timings.mjs            # all songs
//   node scripts/sync-music-timings.mjs perfect    # one slug

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");
const USER_AGENT = "amazing-school-app/0.2 (English teaching platform; +lrclib timing sync)";

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

function findTimestampForLine(lrcLines, target, opts = {}) {
  const targetNorm = normalize(target);
  if (targetNorm.length < 3) return null;

  // If `after` is set (from a previous prompt), require at least 4s gap so
  // repeated chorus lines pick up the NEXT occurrence, not the same one.
  const startFrom = opts.after != null ? opts.after + 4 : 0;

  // 1) exact match
  for (const { t, text } of lrcLines) {
    if (t < startFrom) continue;
    if (normalize(text) === targetNorm) return t;
  }
  // 2) LRC line starts with our target (common when our excerpt is a fragment)
  for (const { t, text } of lrcLines) {
    if (t < startFrom) continue;
    const n = normalize(text);
    if (n.startsWith(targetNorm) || targetNorm.startsWith(n)) return t;
  }
  // 3) substring either direction
  for (const { t, text } of lrcLines) {
    if (t < startFrom) continue;
    const n = normalize(text);
    if (n.includes(targetNorm) || targetNorm.includes(n)) return t;
  }
  // 4) bag-of-words — require ≥70% of target words to appear in LRC line, in order
  const targetWords = targetNorm.split(" ");
  if (targetWords.length >= 3) {
    for (const { t, text } of lrcLines) {
      if (t < startFrom) continue;
      const n = normalize(text);
      let i = 0;
      let hits = 0;
      for (const w of targetWords) {
        const idx = n.indexOf(w, i);
        if (idx >= 0) {
          hits++;
          i = idx + w.length;
        }
      }
      if (hits / targetWords.length >= 0.7) return t;
    }
  }
  return null;
}

async function fetchSynced({ artist, title, album, duration }) {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });
  if (album) params.set("album_name", album);
  if (duration) params.set("duration", String(duration));
  const url = `https://lrclib.net/api/get?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`LRCLIB ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.syncedLyrics ?? null;
}

async function syncSong(slug) {
  const filePath = path.join(SONGS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  skip — no file ${slug}.json`);
    return;
  }
  const song = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const synced = await fetchSynced({
    artist: song.artist,
    title: song.title,
    album: song.album,
    duration: song.duration_seconds,
  });

  if (!synced) {
    // retry without album (LRCLIB album match is strict)
    const fallback = await fetchSynced({
      artist: song.artist,
      title: song.title,
      duration: song.duration_seconds,
    });
    if (!fallback) {
      console.log(`  ${slug}: NO MATCH on LRCLIB`);
      return;
    }
    return applyTimings(song, filePath, parseLrc(fallback));
  }

  return applyTimings(song, filePath, parseLrc(synced));
}

function applyTimings(song, filePath, lrcLines) {
  if (lrcLines.length === 0) {
    console.log(`  ${song.slug}: empty LRC`);
    return;
  }

  const changes = [];

  // sing_along prompts
  if (song.sing_along?.prompts) {
    for (let i = 0; i < song.sing_along.prompts.length; i++) {
      const p = song.sing_along.prompts[i];
      if (!p.lines?.[0]) continue;
      const after = i === 0 ? 0 : song.sing_along.prompts[i - 1].start_seconds ?? 0;
      const t = findTimestampForLine(lrcLines, p.lines[0], { after });
      if (t !== null && Math.abs(t - (p.start_seconds ?? 0)) >= 1) {
        changes.push(
          `    prompt[${i}] "${p.lines[0].slice(0, 40)}…" : ${p.start_seconds ?? "?"}s → ${Math.round(t)}s`
        );
        p.start_seconds = Math.floor(t);
      }
    }
  }

  // listen_and_fill exercises
  if (song.exercises) {
    for (let i = 0; i < song.exercises.length; i++) {
      const ex = song.exercises[i];
      if (ex.type !== "listen_and_fill") continue;
      const pivot = [ex.excerpt_before, ex.answer, ex.excerpt_after]
        .filter(Boolean)
        .join(" ")
        .trim();
      const t = findTimestampForLine(lrcLines, pivot);
      if (t !== null && Math.abs(t - (ex.youtube_start ?? 0)) >= 1) {
        const newStart = Math.floor(t);
        const oldEnd = ex.youtube_end ?? newStart + 16;
        const delta = newStart - (ex.youtube_start ?? 0);
        changes.push(
          `    exercise[${i}] listen_and_fill : start ${ex.youtube_start}s → ${newStart}s`
        );
        ex.youtube_start = newStart;
        ex.youtube_end = Math.max(newStart + 8, oldEnd + delta);
      }
    }
  }

  if (changes.length === 0) {
    console.log(`  ${song.slug}: already synced`);
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(song, null, 2) + "\n");
  console.log(`  ${song.slug}:`);
  for (const c of changes) console.log(c);
}

const onlySlug = process.argv[2];
const files = fs
  .readdirSync(SONGS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.basename(f, ".json"));

const targets = onlySlug ? files.filter((f) => f === onlySlug) : files;

if (targets.length === 0) {
  console.error(`No matching songs for "${onlySlug}"`);
  process.exit(1);
}

console.log(`Syncing timings for ${targets.length} song(s) via LRCLIB…`);
for (const slug of targets) {
  try {
    await syncSong(slug);
  } catch (err) {
    console.log(`  ${slug}: ERROR ${err.message}`);
  }
}
console.log("\nDone.");
