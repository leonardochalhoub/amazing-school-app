# Content Pipeline

Offline pipeline that turns open-licensed source passages into CEFR-graded lesson JSON files published under `content/lessons/{cefr}/{skill}/{slug}.json`.

## Prerequisites

- `ANTHROPIC_API_KEY` set in your local `.env` (used only by these scripts — never exposed to the runtime app).
- `npm install` completed so `tsx`, `@ai-sdk/anthropic`, `ai`, and `zod` are present.

## Stages

```text
fetch → chunk → generate → validate → publish → (index rebuild)
```

## Commands

```bash
# 1. Fetch source pages (needs scripts/content/targets.json)
npm run content:fetch

# 2. Clean + chunk the raw HTML
npm run content:chunk

# 3. Generate lesson JSON with Sonnet (cost-tracked)
npm run content:generate -- --cefr a2.1 --skill grammar --budget 2.00

# 4. Validate with Haiku + Zod schema
npm run content:validate

# 5. Publish validated JSON into content/lessons/ and rebuild the index
npm run content:publish

# Run every stage (for full resume-aware runs)
npm run content:run -- --cefr a2.1 --skill grammar --budget 5.00 --resume
```

## Targets file

`scripts/content/targets.json` (not committed) — array of:

```json
[
  {
    "url": "https://learnenglish.britishcouncil.org/grammar/...",
    "cefr": "a2.1",
    "skill": "grammar"
  }
]
```

Only URLs whose hostname is in `CONTENT_ALLOWED_SOURCES` are fetched.

## Budget

`CONTENT_PIPELINE_BUDGET_USD` (default `$5.00`) is enforced per stage invocation. The generate stage aborts immediately if the cap is crossed; the run manifest records remaining work so you can `--resume` later.

## Licenses

Every lesson records its `sources[]` with `{url, title, license}`. The pipeline maps allow-listed hosts to:

| Host | License |
|---|---|
| `learnenglish.britishcouncil.org` | `cc-by-nc` |
| `learningenglish.voanews.com` | `public-domain` |
| `en.wikibooks.org` | `cc-by-sa` |
| `www.gutenberg.org` | `public-domain` |

## Directory layout

```text
scripts/content/
  config.ts           # models, budget, allow-list, license map
  run.ts              # orchestrator
  fetch-sources.ts    # HTML fetch → data/raw/
  clean-and-chunk.ts  # raw → plain text → chunks
  generate-lessons.ts # Sonnet → data/generated/
  validate-lessons.ts # Haiku + Zod → data/validated/
  publish-lessons.ts  # → content/lessons/**
  prompts/
    generate-lesson.md
    validate-lesson.md
  lib/
    claude.ts, cost-tracker.ts, manifest.ts, log.ts, args.ts, rebuild-index.ts
  data/               # gitignored; working artifacts per stage
```

## Recovery

If a run is interrupted:

- The per-lesson outputs are idempotent — files already in `data/generated/` are skipped unless `--force`.
- Rerun with the same flags; previously-completed lessons short-circuit.
- The manifest under `data/manifests/{run_id}.json` records cost, rejects, and stage stats.
