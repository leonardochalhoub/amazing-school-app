#!/usr/bin/env node
// Rebuilds content/music/index.json from every content/music/songs/*.json file.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");
const INDEX_FILE = path.resolve(__dirname, "..", "content", "music", "index.json");

const CEFR_ORDER = ["a1.1","a1.2","a2.1","a2.2","b1.1","b1.2","b2.1","b2.2","c1.1","c1.2"];

const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith(".json"));
const songs = files.map((f) => {
  const s = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, f), "utf8"));
  return {
    slug: s.slug,
    title: s.title,
    artist: s.artist,
    year: s.year,
    cefr_level: s.cefr_level,
    difficulty: s.difficulty,
    genre: s.genre,
    duration_seconds: s.duration_seconds,
  };
});

songs.sort((a, b) => {
  const ai = CEFR_ORDER.indexOf(a.cefr_level);
  const bi = CEFR_ORDER.indexOf(b.cefr_level);
  if (ai !== bi) return ai - bi;
  return a.artist.localeCompare(b.artist);
});

const out = {
  generated_at: new Date().toISOString().slice(0, 10),
  catalog_size_target: 30,
  songs,
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${songs.length} songs to ${path.relative(process.cwd(), INDEX_FILE)}`);
