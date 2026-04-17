#!/usr/bin/env node
// For every song JSON where vocab_hooks have an empty `pt`, ask Groq for a
// Brazilian-Portuguese gloss in batch (50 terms per request), then write
// the translations back into the file.
//
// Usage:
//   GROQ_API_KEY=... node scripts/translate-vocab.mjs
//   GROQ_API_KEY=... node scripts/translate-vocab.mjs --limit=20
//   GROQ_API_KEY=... node scripts/translate-vocab.mjs --force  # retranslate all

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, "..", "content", "music", "songs");

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const localEnv = loadEnv();
const GROQ_KEY = process.env.GROQ_API_KEY ?? localEnv.GROQ_API_KEY;
if (!GROQ_KEY) {
  console.error("GROQ_API_KEY not set (checked env + .env.local)");
  process.exit(1);
}

const MODEL = "llama-3.3-70b-versatile";

async function translateBatch(terms) {
  const prompt = `Translate each of these English words or short phrases to Brazilian Portuguese. Keep it short (1–4 words), natural, informal register suitable for song-lyric study. Return ONLY a JSON object mapping each term to its translation. No explanation, no markdown.

Terms:
${terms.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Output strictly as:
{"term1":"tradução1","term2":"tradução2"}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".json"));
  const jobs = [];
  for (const f of files) {
    const file = path.join(SONGS_DIR, f);
    const song = JSON.parse(fs.readFileSync(file, "utf8"));
    const hooks = song.vocab_hooks ?? [];
    const needsTranslation = hooks.filter(
      (h) => force || !h.pt || h.pt.length === 0
    );
    if (needsTranslation.length > 0) {
      jobs.push({ file, song, hooks, needsTranslation });
    }
  }

  const planned = jobs.slice(0, limit);
  console.log(
    `Translating vocab on ${planned.length}/${jobs.length} songs via Groq (${MODEL})…`
  );

  let songOk = 0;
  let termsTotal = 0;
  let i = 0;
  for (const job of planned) {
    i += 1;
    try {
      const terms = job.needsTranslation.map((h) => h.term);
      const translations = await translateBatch(terms);
      let changed = false;
      for (const hook of job.hooks) {
        const pt = translations[hook.term] ?? translations[hook.term.toLowerCase()];
        if (pt && typeof pt === "string" && pt.trim()) {
          hook.pt = pt.trim();
          changed = true;
          termsTotal += 1;
        }
      }
      if (changed) {
        job.song.vocab_hooks = job.hooks;
        fs.writeFileSync(job.file, JSON.stringify(job.song, null, 2) + "\n");
        songOk += 1;
      }
      if (i % 25 === 0 || i === planned.length) {
        console.log(
          `  [${i}/${planned.length}] songs=${songOk} terms=${termsTotal}`
        );
      }
    } catch (err) {
      console.log(`  ERR ${path.basename(job.file)}: ${err.message}`);
    }
    // Stay well under Groq's 30 RPM limit (1 request every 2.1s ≈ 28 RPM).
    await new Promise((r) => setTimeout(r, 2100));
  }

  console.log(`\nDone: ${songOk} songs updated, ${termsTotal} terms translated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
