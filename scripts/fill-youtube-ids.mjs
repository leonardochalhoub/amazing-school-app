#!/usr/bin/env node
// For every song JSON with an empty or 404-ing youtube_id, search
// https://www.youtube.com/results?search_query={artist}+{title}+official,
// take the first embedded videoId, verify via oembed that it's playable,
// and write it back into the file.
//
// Usage:
//   node scripts/fill-youtube-ids.mjs                   # all songs missing an id
//   node scripts/fill-youtube-ids.mjs --check-existing  # also verify existing IDs, swap if broken
//   node scripts/fill-youtube-ids.mjs --conc=4          # parallelism (default 4)
//   node scripts/fill-youtube-ids.mjs --limit=20        # stop after N

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchWithRetry(url, init, tries = 4) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err) {
      lastErr = err;
      // Exponential backoff with jitter: 500ms, 1.5s, 4.5s, 13.5s
      const waitMs = 500 * Math.pow(3, i) + Math.random() * 400;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

async function searchYoutube(artist, title) {
  const q = encodeURIComponent(`${artist} ${title} official`);
  const url = `https://www.youtube.com/results?search_query=${q}`;
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const seen = new Set();
  const ordered = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ordered.push(m[1]);
      if (ordered.length >= 5) break;
    }
  }
  return ordered;
}

async function verifyEmbeddable(id) {
  const u = `https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${id}&format=json`;
  try {
    const res = await fetchWithRetry(u, {}, 3);
    if (!res.ok) return null;
    const json = await res.json();
    return {
      title: json.title ?? "",
      author: json.author_name ?? "",
    };
  } catch {
    return null;
  }
}

async function findBestId(artist, title) {
  const candidates = await searchYoutube(artist, title);
  if (!candidates || candidates.length === 0) return null;
  // Try the first 3 until one is embeddable.
  for (const id of candidates.slice(0, 3)) {
    const v = await verifyEmbeddable(id);
    if (v) return { id, ...v };
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const checkExisting = args.includes("--check-existing");
  const concArg = args.find((a) => a.startsWith("--conc="));
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const concurrency = concArg ? Number(concArg.split("=")[1]) : 4;
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".json"));
  const all = files.map((f) => ({
    file: path.join(SONGS_DIR, f),
    song: JSON.parse(fs.readFileSync(path.join(SONGS_DIR, f), "utf8")),
  }));
  const targets = all.filter(({ song }) =>
    checkExisting ? true : !song.youtube_id
  );
  const plan = targets.slice(0, limit);

  console.log(
    `Filling YouTube IDs for ${plan.length} song(s) (conc=${concurrency}, check-existing=${checkExisting})…`
  );

  const stats = { ok: 0, kept: 0, missing: 0, errored: 0 };
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= plan.length) break;
      const { file, song } = plan[idx];
      try {
        // When --check-existing: verify current id first; skip if still works.
        if (checkExisting && song.youtube_id) {
          const v = await verifyEmbeddable(song.youtube_id);
          if (v) {
            stats.kept += 1;
            done += 1;
            if (done % 25 === 0 || done === plan.length) {
              console.log(
                `  [${done}/${plan.length}] ok=${stats.ok} kept=${stats.kept} miss=${stats.missing}`
              );
            }
            continue;
          }
        }
        const best = await findBestId(song.artist, song.title);
        if (!best) {
          stats.missing += 1;
        } else {
          song.youtube_id = best.id;
          fs.writeFileSync(file, JSON.stringify(song, null, 2) + "\n");
          stats.ok += 1;
        }
      } catch (err) {
        stats.errored += 1;
        console.log(`  ERR ${song.artist} / ${song.title}: ${err.message}`);
      }
      done += 1;
      if (done % 25 === 0 || done === plan.length) {
        console.log(
          `  [${done}/${plan.length}] ok=${stats.ok} kept=${stats.kept} miss=${stats.missing} err=${stats.errored}`
        );
      }
      // Rate-limit politely.
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log("\nSummary:");
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
