# DESIGN: English Teaching Platform — V2

> Technical design for evolving the v1 MVP into a platform with a sober teacher admin surface, per-student lesson management, avatars, DB-backed rate limiting, a ~420-lesson CEFR library from a hybrid LLM + open-curation pipeline, and an initial test harness.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM_V2 |
| **Date** | 2026-04-16 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md](./DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md) |
| **BRAINSTORM** | [BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md](./BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md) |
| **Status** | Ready for Build |

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                       RUNTIME APP (Next.js 16 on Vercel)                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   app/(dashboard)/student/*          app/(dashboard)/teacher/*             │
│   [playful tokens — v1 unchanged]    [sober tokens — NEW sober register]   │
│        │                                    │                              │
│        │  Server Actions                    │  Server Actions              │
│        ▼                                    ▼                              │
│   lib/actions/{lessons,gamification,…}  lib/actions/{assignments,          │
│                                          notes,avatars,…}                  │
│        │                                    │                              │
│        └──────────────┬─────────────────────┘                              │
│                       ▼                                                    │
│                ┌──────────────┐      ┌───────────────┐                     │
│                │ Supabase DB  │◀────▶│ Supabase      │                     │
│                │ + RLS        │      │ Storage       │                     │
│                │ + Realtime   │      │ (avatars)     │                     │
│                └──────┬───────┘      └───────────────┘                     │
│                       │                                                    │
│                       │  ai_usage table (DB rate limit)                    │
│                       ▼                                                    │
│                 ┌─────────────┐                                            │
│    app/api/chat │  Claude     │ ← streaming AI tutor (unchanged)           │
│     route.ts    │  Haiku 4.5  │                                            │
│                 └─────────────┘                                            │
│                                                                            │
│   Static content (bundled):                                                │
│        content/lessons/{cefr}/{skill}/{slug}.json  ← ~420 files            │
│        content/lessons/index.json                  ← CEFR-indexed          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                      OFFLINE CONTENT PIPELINE (scripts/content/)           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   [Open sources HTML] ──fetch──▶ [raw/] ──clean──▶ [chunks/]               │
│   (BC/VOA/Wikibooks/Gutenberg)                           │                 │
│                                                          ▼                 │
│                                                 ┌────────────────┐         │
│                                                 │ Claude Sonnet  │         │
│                                                 │ (generate)     │         │
│                                                 └────┬───────────┘         │
│                                                      ▼                     │
│                                           ┌─────────────────────┐          │
│                                           │ Claude Haiku        │          │
│                                           │ (validate schema +  │          │
│                                           │  pedagogical check) │          │
│                                           └────┬────────────────┘          │
│                                                ▼                           │
│                      content/lessons/{cefr}/{skill}/{slug}.json            │
│                      + run manifest (tokens, cost, timestamps)             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow — Teacher assigns a lesson to a single student

```text
1. Teacher opens /teacher/classroom/[id] (dense dashboard)
   │  RSC fetches: classroom, members (with avatars), XP, streak, last_activity
   ▼
2. Teacher clicks a student card → /teacher/classroom/[id]/students/[studentId]
   │  RSC fetches: per-student assignments, progress, notes
   ▼
3. Teacher selects a lesson from the library picker and clicks "Assign"
   │  Server Action: assignLessonToStudent(classroomId, studentId, lessonSlug, order)
   │   - INSERT INTO lesson_assignments (classroom_id, student_id, lesson_slug, ...)
   │   - RLS: teacher of classroom can write
   ▼
4. revalidatePath on the student-detail route
   │  Realtime channel emits to student's dashboard
   ▼
5. Student loads /student; sees new lesson in their queue (ordered by order_index)
```

---

## Components

| Component | Purpose | Technology | Status |
|-----------|---------|------------|--------|
| **Student UI** (`app/(dashboard)/student/*`) | Student-facing lessons, chat, leaderboard | Next.js 16 App Router + React 19 | Unchanged from v1 |
| **Teacher UI** (`app/(dashboard)/teacher/*`) | Sober admin console — student grid, per-student manager, classroom ops | Next.js 16, new `teacher-tokens` | Rewritten UI, same routes + new sub-routes |
| **Design Tokens** (`lib/design/*`) | Two token sets sharing shadcn primitives | Tailwind v4 CSS vars + `lib/design/*.ts` exports | NEW |
| **Assignments Domain** (`lib/actions/assignments.ts`) | Per-student + bulk assignment, reorder, unassign | Server Actions + Supabase | NEW (v1 was classroom-only) |
| **Notes Domain** (`lib/actions/notes.ts`) | Teacher private notes per student | Server Actions + Supabase | NEW |
| **Avatars Domain** (`lib/actions/avatars.ts`) | Signed-URL upload, compression, `profiles.avatar_url` update | Server Actions + Supabase Storage + Sharp | NEW |
| **AI Rate Limiter** (`lib/ai/rate-limit.ts`) | Daily DB-backed fixed-window per user | Supabase `ai_usage` table | Rewritten (was in-memory/message-count) |
| **Content Loader** (`lib/content/loader.ts`) | CEFR-indexed lesson access + lazy import | TS + static JSON | Refactored for CEFR index + skill partition |
| **Content Pipeline** (`scripts/content/*`) | Offline fetch → clean → generate → validate → write | Node + `@ai-sdk/anthropic` + Zod | NEW, offline-only |
| **Realtime Dashboard** (`components/teacher/realtime-grid.tsx`) | Live student progress updates on teacher grid | Supabase Realtime (Postgres changes) | NEW |
| **Test Harness** | Unit + integration + e2e | Vitest + Testing Library + Playwright | NEW |

---

## Key Decisions

### Decision 1: Extend existing `lesson_assignments` table with a nullable `student_id` (not a new table)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** v1's `lesson_assignments` is classroom-scoped (no `student_id`). V2 needs per-student assignments plus bulk (classroom-wide). Must be additive — must not break v1 behavior.

**Choice:** Add `student_id UUID NULL REFERENCES profiles(id)` and `order_index INT NOT NULL DEFAULT 0` and `status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','skipped','completed'))` to the existing table via migration `002`. Semantics:

- `student_id IS NULL` → classroom-wide assignment (v1 semantics preserved; every student in the classroom sees it).
- `student_id IS NOT NULL` → per-student assignment (overrides / targets individuals).

**Rationale:**
- Zero breaking change — existing rows are `student_id = NULL`, still behave as classroom-wide.
- One source of truth for "what lessons is this student seeing" — a single query with `WHERE classroom_id = $1 AND (student_id = $2 OR student_id IS NULL)`.
- Uses an existing index path (classroom_id).
- "Bulk assign to classroom" = one row with `student_id = NULL`; "per-student" = N rows.

**Alternatives Rejected:**
1. **New `student_assignments` table** — duplicates assignment concept across two tables, harder to query "what's on this student's queue", more migration code. Rejected.
2. **Denormalize into one row per student even for bulk** — N-write amplification for classroom-wide assignments. Rejected.

**Consequences:**
- The existing v1 RLS policy on `lesson_assignments` must be extended: students see rows where `classroom_id` is one of their classrooms AND (`student_id IS NULL OR student_id = auth.uid()`).
- Query sites (1 location in `lib/actions/lessons.ts`) must be updated.
- Unique-index needed to prevent duplicates: `UNIQUE (classroom_id, lesson_slug, student_id)` with special handling for NULL via partial unique indexes (two indexes: one for NULL `student_id`, one for non-NULL).

---

### Decision 2: Lessons stay as JSON files on disk; new CEFR-partitioned directory layout

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** v1 places lessons under `content/lessons/{category}/{slug}.json` with a flat `index.json`. V2 scales from 3 lessons to ~420. Free-tier DB space (500 MB) matters; build-time static bundling beats per-lesson DB fetches.

**Choice:** Keep lessons as JSON files, but partition by CEFR sub-level:

```text
content/lessons/
  index.json                    # array of LessonMeta entries for the whole library
  by-cefr.json                  # map of cefr_level -> ordered lesson slugs
  a1-1/
    grammar/
      {slug}.json
    vocabulary/
    reading/
  a1-2/ …
  b1-2/
```

**Rationale:**
- Dir-based partition keeps any one folder under a few dozen files; easy to diff in git.
- `index.json` remains single-source for metadata (as in v1) — unchanged consumption pattern.
- New `by-cefr.json` is a pre-computed index for fast "show me A2.1 grammar" queries without scanning `index.json`.
- Lazy-import continues to work: `import(\`@/content/lessons/${cefr_dir}/${skill}/${slug}.json\`)`.

**Alternatives Rejected:**
1. **Move to Postgres** — free-tier 500 MB budget tighter, runtime DB reads for every lesson load, larger migration. Rejected per BRAINSTORM Decision #6.
2. **Flat dir with 420 files** — git diff noise, slower glob, harder to review by CEFR batch. Rejected.

**Consequences:**
- The existing 3 v1 lessons must be moved into `a1-1/{skill}/...` as part of migration `005` data-fix script.
- Content loader `lib/content/loader.ts` gains a CEFR lookup path but keeps its `LessonMeta` contract.
- The v1 `level: "A1"` string becomes `cefr_level: "a1.1"` (BC/CEFR sub-level). Old field kept temporarily as alias for one release.

---

### Decision 3: Supabase Storage bucket `avatars`, public-read within classroom via RLS + Sharp for compression

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** Students need profile photos. Teacher dashboard needs to show them. v1 has `profiles.avatar_url` but no bucket wired up.

**Choice:**
- Create Supabase Storage bucket `avatars` (private, RLS-gated).
- Object path convention: `avatars/{user_id}.webp`.
- Uploads go through a Server Action that validates type/size, compresses via Sharp to WebP at max 512×512, writes to Storage, updates `profiles.avatar_url` with the storage path (not a public URL).
- Reads use signed URLs (`storage.from('avatars').createSignedUrl(path, 3600)`) via a Server Action or on-demand in RSC.
- Storage RLS: owner (auth.uid()) can INSERT/UPDATE/DELETE their own object; classmates (via `classroom_members` join) can generate signed URLs to read.

**Rationale:**
- Uses existing Supabase ecosystem — no new vendor.
- Signed URLs avoid making student photos globally public while still being cacheable.
- Sharp is the de-facto standard for Node image processing and has a small runtime footprint on Vercel serverless.
- Path convention (`{user_id}.webp`) makes RLS trivial: owner check is `storage.objects.name = auth.uid() || '.webp'`.

**Alternatives Rejected:**
1. **Cloudinary / imgproxy** — new vendor, extra secrets to manage. Rejected.
2. **Public bucket, hash-based names** — leaks "was a photo uploaded" via enumeration; weaker auth model. Rejected.
3. **Base64 in `profiles.avatar_url`** — blows up row size, unhappy serialization on reads. Rejected.

**Consequences:**
- Need Sharp in dependencies (~4 MB cold-start cost on Vercel; acceptable for a mutation path).
- RLS on `storage.objects` rows is slightly complex but standard.
- Must add SERVICE_ROLE helper for the image-processing path if we want to bypass RLS on write (we don't need to — owner can write their own object).

---

### Decision 4: AI rate limiting via new `ai_usage` table with fixed daily window

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** v1 rate limiter in `lib/ai/rate-limit.ts` currently counts user messages per day via a cross-table query on `messages` + `conversations`. That works but is slower than needed and couples rate-limiting to message-persistence, making it hard to rate-limit before inserting. It is not in-memory (the BRAINSTORM description was slightly wrong), but it still needs to be tightened.

**Choice:** New migration-created table:

```sql
CREATE TABLE ai_usage (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_date)
);
```

Rate limiter is a single upsert-with-return: increment `count` by 1 for `(user_id, CURRENT_DATE)` and compare against the configured daily limit. Cold starts are fine — state lives in Postgres.

**Rationale:**
- Cheap (~1 ms): indexed primary key lookup, single row per user per day.
- Decoupled from `messages` — rate limit applies even before a conversation row exists.
- Simple window semantics (UTC day) matching the existing v1 limit.
- Serverless-cold-start safe by construction (no in-memory cache assumed).

**Alternatives Rejected:**
1. **Upstash Redis / Vercel KV** — new vendor, more secrets, free-tier constraints. Rejected per YAGNI.
2. **Keep the current message-count approach** — couples rate-limit to write-path, slower, harder to test. Rejected.
3. **Sliding window (e.g., rolling 24h)** — more complex (needs aggregated log), not needed for current limit semantics. Rejected.

**Consequences:**
- `lib/ai/rate-limit.ts` signature becomes `checkAndIncrement(userId)`; callers must invoke before streaming.
- If the downstream Claude call fails, we do not currently decrement — acceptable (fail-safe, slight over-counting). A TODO for later refinement.
- RLS on `ai_usage`: service-role writes (the Server Action runs with user context; RLS allows user to INSERT/UPDATE their own row).

---

### Decision 5: Two design-token sets sharing shadcn primitives (teacher vs. student), not two UI kits

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** Teacher surface must feel sober / data-dense; student surface must stay playful / gamified. Keep bundle size constrained (Goal: ≤ 20% bundle growth).

**Choice:**
- Keep shadcn/ui as the sole component kit.
- Define two token sets as CSS custom properties in `app/globals.css` under scope classes:
  - `.theme-student` — current playful palette (emerald/violet accents, rounded radius, generous spacing).
  - `.theme-teacher` — sober palette (slate/zinc, no accent gradients, tighter spacing, smaller type scale).
- Attach the scope class at the route-group layout level:
  - `app/(dashboard)/student/layout.tsx` → `<div className="theme-student">...</div>`
  - `app/(dashboard)/teacher/layout.tsx` → `<div className="theme-teacher">...</div>`
- Export typed token constants from `lib/design/{student,teacher}-tokens.ts` for consumers that need programmatic access (chart colors, etc.).

**Rationale:**
- Single component kit — no bundle-size blow-up.
- CSS-variable scoping is free (no runtime cost) and composable with dark mode (existing `next-themes`).
- The teacher side still has access to every shadcn primitive; only the look changes.

**Alternatives Rejected:**
1. **Separate UI kit (Tremor / Mantine Admin)** — Approach B in BRAINSTORM; bundle size grows, divergent patterns. Rejected.
2. **Per-component teacher variants (`<TeacherCard />` etc.)** — explosion of components; harder to maintain. Rejected.

**Consequences:**
- Dark mode must be tested per theme scope (two palettes × light/dark = four combinations). Gate with Playwright visual diff on two pages.
- Lesson-player and gamification components are student-only; they should never appear under `theme-teacher` (a lint rule or a README convention is enough).

---

### Decision 6: Content pipeline is an offline Node script tree, not a runtime feature

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** Need to generate ~420 lessons from open sources using Claude. Budget is capped; generation takes hours; quality requires a validation pass.

**Choice:** Build `scripts/content/` as standalone Node scripts (ESM, TypeScript via `tsx`). Pipeline stages:

```text
scripts/content/
  fetch-sources.ts         # fetches allow-listed open-source pages to data/raw/
  clean-and-chunk.ts       # HTML → text → CEFR-graded chunks → data/chunks/
  generate-lessons.ts      # Sonnet: grounded lesson JSON from chunks → data/generated/
  validate-lessons.ts      # Haiku + Zod: schema + pedagogical checks → data/validated/
  publish-lessons.ts       # copies validated JSON into content/lessons/{cefr}/{skill}/
  run.ts                   # orchestrates stages with --resume + --cefr + --skill flags
  config.ts                # budget caps, source allow-list, model IDs
  prompts/                 # versioned Sonnet + Haiku prompt templates
  lib/
    cost-tracker.ts        # aborts if per-run spend > budget
    manifest.ts            # writes scripts/content/data/manifests/{run_id}.json
    schema.ts              # Zod schema mirroring lib/content/loader.ts types
```

Inputs via CLI: `npm run content:run -- --cefr a2.1 --skill grammar --budget 5.00`.

**Rationale:**
- Offline → safe to take hours, no user-facing latency.
- Resumable (per-lesson idempotent) → solo developer can run overnight, resume next day.
- Cost cap is an explicit abort condition → no surprise bills.
- Prompt versioning + run manifest → reproducible, auditable.

**Alternatives Rejected:**
1. **Generate in-app at request time** — unacceptable latency, runtime cost, and reliability risk. Rejected.
2. **Use a notebook / Python** — adds another language to the repo. Rejected.

**Consequences:**
- Generated lessons are committed to the repo as JSON (git is the "ledger" for content versions).
- `scripts/content/data/` lives outside the Next.js bundle (ignored in `next.config.ts`).
- Need secure handling of `ANTHROPIC_API_KEY` (used only in scripts, not exposed to client).

---

### Decision 7: Realtime teacher grid uses Supabase Postgres Changes, not polling

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** Teacher dashboard should show student activity updates "live". Supabase Realtime is on the free tier (200 concurrent).

**Choice:**
- A single client component `components/teacher/realtime-grid.tsx` subscribes to Postgres changes on:
  - `xp_events` filtered by `classroom_id`
  - `lesson_progress` filtered by `classroom_id`
  - `daily_activity` filtered by `student_id IN (...)` (the classroom's students)
- Server-rendered initial state; client patches in place on events.
- Subscription is scoped to the classroom the teacher has open; unsubscribes on unmount.

**Rationale:**
- Push beats poll for battery and cost.
- Supabase Realtime is already enabled for the project (free tier).
- Scoped subscriptions keep concurrent-connection count low (1 per open classroom tab).

**Alternatives Rejected:**
1. **Poll every 10 s** — wastes requests and bandwidth. Rejected.
2. **Subscribe globally (no classroom filter)** — noisy updates, RLS still helps but performance suffers. Rejected.

**Consequences:**
- If Realtime quotas become an issue, fallback is easy: remove the client subscription, add a `revalidatePath` cadence. We won't implement the fallback preemptively.
- Requires RLS on `xp_events` and `lesson_progress` to be permissive enough for the teacher (already true in v1 RLS) — verify with an integration test.

---

### Decision 8: Test harness — Vitest (unit + integration) + Playwright (e2e), no new CI platform

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** v1 has no tests. V2 expands surface ~5× — manual QA won't scale.

**Choice:**
- **Vitest** with `happy-dom` env for unit tests in `tests/unit/` and integration tests for Server Actions in `tests/integration/`.
- **Playwright** for e2e in `tests/e2e/`, running against a local `next dev` with a test-mode Supabase project (env-switched via `.env.test`).
- Test scripts: `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run test:all`.
- CI: none in v2 (solo dev; add GitHub Actions in a later phase).

**Rationale:**
- Vitest + Testing Library matches React 19 and is fast enough that watch-mode stays usable.
- Playwright is the standard for Next.js e2e and has first-class support for cookies/auth.
- No CI yet — running tests locally via a pre-commit hook is enough for solo-dev scale.

**Alternatives Rejected:**
1. **Jest** — slower, heavier config, worse React 19 story. Rejected.
2. **Cypress** — slower, Playwright covers what we need. Rejected.

**Consequences:**
- Need a `tests/fixtures/supabase-test-client.ts` that uses the service role to seed/teardown rows.
- Integration tests require a reachable Postgres (local Supabase via `supabase start` in development; skip-on-missing in v2).

---

### Decision 9: Lesson JSON schema evolves additively

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-16 |

**Context:** v1 lesson schema has `level: "A1"`. V2 needs sub-levels, source attribution, generator metadata.

**Choice:** Add fields, don't remove. New schema (Zod-typed):

```ts
{
  slug: string,
  title: string,
  description: string,
  category: "grammar" | "vocabulary" | "reading" | "listening",
  level: "A1" | "A2" | "B1",           // kept for v1 compat
  cefr_level: "a1.1" | "a1.2" | "a2.1" | "a2.2" | "b1.1" | "b1.2",  // NEW
  xp_reward: number,
  estimated_minutes: number,
  exercises: Exercise[],
  // NEW v2 fields (all optional for v1 lessons during transition):
  summary_pt_br?: string,
  sources?: { url: string, title: string, license: "cc-by"|"cc-by-sa"|"cc-by-nc"|"public-domain" }[],
  generator_model?: string,
  generated_at?: string  // ISO 8601
}
```

A data-fix script fills the new fields for v1 lessons (cefr_level = "a1.1", sources = platform self-cite).

**Rationale:** No reader code paths need to break during the transition; Zod validates the superset.

**Alternatives Rejected:** Major schema version bump with a migration script. Rejected — not needed for five new optional fields.

**Consequences:** Two-field level system (`level` + `cefr_level`) until v3, at which point `level` can be dropped.

---

## File Manifest

Legend — Action: **C** = Create, **M** = Modify, **D** = Delete, **R** = Rename.

### Supabase migrations (additive only — `002` → `005`)

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/002_assignments_v2.sql` | C | Extend `lesson_assignments` with `student_id`, `order_index`, `status`; new RLS; partial unique indexes | (general) | — |
| 2 | `supabase/migrations/003_student_notes.sql` | C | New `student_notes` table + RLS (teacher-only read/write) | (general) | — |
| 3 | `supabase/migrations/004_ai_usage.sql` | C | New `ai_usage` table + RLS | (general) | — |
| 4 | `supabase/migrations/005_lesson_metadata_and_avatars.sql` | C | Create `avatars` Storage bucket + RLS policies on `storage.objects`; no schema change to `profiles` (column `avatar_url` already exists) | (general) | — |

### Content pipeline (offline, new)

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 5 | `scripts/content/config.ts` | C | Source allow-list, model IDs, budget cap env reads | @llm-specialist | — |
| 6 | `scripts/content/lib/schema.ts` | C | Zod schema for lesson JSON (shared w/ runtime loader via re-export) | @python-developer (TypeScript equivalent OK) | — |
| 7 | `scripts/content/lib/cost-tracker.ts` | C | Token + USD accounting; abort on budget exceeded | @llm-specialist | 5 |
| 8 | `scripts/content/lib/manifest.ts` | C | Run manifest writer (JSON artifact per run) | @python-developer | 5 |
| 9 | `scripts/content/fetch-sources.ts` | C | Fetches allow-listed pages to `scripts/content/data/raw/` | @ai-data-engineer | 5 |
| 10 | `scripts/content/clean-and-chunk.ts` | C | HTML → text → CEFR chunks → `data/chunks/` | @ai-data-engineer | 9 |
| 11 | `scripts/content/prompts/generate-lesson.md` | C | Sonnet prompt template (grounded, structured output) | @ai-prompt-specialist | — |
| 12 | `scripts/content/prompts/validate-lesson.md` | C | Haiku prompt template (JSON schema + pedagogical spot-check) | @ai-prompt-specialist | — |
| 13 | `scripts/content/generate-lessons.ts` | C | Sonnet pass — reads chunks, writes `data/generated/` | @llm-specialist | 7, 8, 11 |
| 14 | `scripts/content/validate-lessons.ts` | C | Haiku pass + Zod — writes `data/validated/` | @llm-specialist | 6, 12 |
| 15 | `scripts/content/publish-lessons.ts` | C | Copies validated JSON into `content/lessons/{cefr}/{skill}/` and rebuilds `index.json` + `by-cefr.json` | @python-developer | 6, 14 |
| 16 | `scripts/content/run.ts` | C | Orchestrator with `--cefr`, `--skill`, `--resume`, `--budget` flags | @shell-script-specialist | 9, 10, 13, 14, 15 |
| 17 | `scripts/content/README.md` | C | How to run the pipeline, cost estimates, recovery steps | @code-documenter | 16 |
| 18 | `scripts/content/data/.gitkeep` | C | Directory placeholder; actual `data/` contents gitignored | (general) | — |

### Content — lessons (data migration + new files)

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 19 | `content/lessons/index.json` | M | Rebuilt from full `{cefr}/{skill}/{slug}.json` tree; CEFR fields populated | (general) | 15 |
| 20 | `content/lessons/by-cefr.json` | C | Pre-computed CEFR → ordered-slug map | (general) | 15 |
| 21 | `content/lessons/a1-1/grammar/present-simple.json` | R | Move + enrich (v1 file) | (general) | 6, 9-15 |
| 22 | `content/lessons/a1-1/grammar/past-simple.json` | R | Move + enrich (v1 file) | (general) | 6 |
| 23 | `content/lessons/a1-1/vocabulary/greetings.json` | R | Move + enrich (v1 file) | (general) | 6 |
| 24 | `content/lessons/a1-1/...` → `content/lessons/b1-2/...` | C (pipeline-emitted) | ~417 new lessons generated by pipeline | — | 15 |
| 25 | `content/lessons/grammar/*.json` | D | Old flat dirs removed after move | (general) | 21-23 |
| 26 | `content/lessons/vocabulary/*.json` | D | Old flat dir removed after move | (general) | 23 |

### Runtime — design tokens & theming

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 27 | `app/globals.css` | M | Add `.theme-student` and `.theme-teacher` CSS variable scopes (light + dark variants) | (general) | — |
| 28 | `lib/design/student-tokens.ts` | C | Typed exports for student palette constants | (general) | 27 |
| 29 | `lib/design/teacher-tokens.ts` | C | Typed exports for teacher palette constants | (general) | 27 |

### Runtime — content loader

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 30 | `lib/content/loader.ts` | M | Add `getLessonsByCefr`, `getLessonsByCefrAndSkill`, `getCefrIndex`; update `getLesson` to walk CEFR dirs; extend `Lesson` type with v2 fields | (general) | 6, 19, 20 |

### Runtime — assignments & notes domain

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 31 | `lib/actions/assignments.ts` | C | `assignToStudent`, `assignToClassroom`, `unassign`, `reorderForStudent`, `setStatus`, `getAssignmentsForStudent`, `getAssignmentsForClassroom` | (general) | 1, 30 |
| 32 | `lib/actions/lessons.ts` | M | `getAssignedLessons` now merges per-student + classroom-wide; `startLesson` unchanged | (general) | 1, 31 |
| 33 | `lib/actions/notes.ts` | C | `createNote`, `listNotesForStudent`, `deleteNote` | (general) | 2 |

### Runtime — avatars

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 34 | `lib/actions/avatars.ts` | C | `uploadAvatar(FormData)` — validate, Sharp-compress to WebP, upload, set `profiles.avatar_url` | (general) | 4 |
| 35 | `lib/supabase/signed-urls.ts` | C | Helper to mint signed URLs for `avatars/{user_id}.webp` for authorized viewers | (general) | 4 |
| 36 | `components/shared/avatar-uploader.tsx` | C | Client component — file input, client-side preview, server action submit | (general) | 34 |
| 37 | `app/(dashboard)/student/profile/page.tsx` | C | Student profile page containing `AvatarUploader` | (general) | 36 |

### Runtime — AI rate limiter (rewrite)

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 38 | `lib/ai/rate-limit.ts` | M | Rewrite to `checkAndIncrement(supabase, userId)` using `ai_usage` table | @ai-data-engineer | 3 |
| 39 | `app/api/chat/route.ts` | M | Swap to `checkAndIncrement`; keep streaming response shape (including `X-Remaining-Messages` header) | (general) | 38 |

### Runtime — teacher UI (sober register, per-student manager, grid)

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 40 | `app/(dashboard)/teacher/layout.tsx` | C | Wrapper that applies `theme-teacher` scope | (general) | 27 |
| 41 | `app/(dashboard)/teacher/page.tsx` | M | Sober classroom list (data-dense table of classrooms + aggregate stats) | (general) | 29, 40 |
| 42 | `app/(dashboard)/teacher/classroom/[id]/page.tsx` | M | Classroom detail = student grid (photos, level, streak, %, last_activity) — replaces v1 layout | (general) | 29, 30, 35, 40 |
| 43 | `app/(dashboard)/teacher/classroom/[id]/students/[studentId]/page.tsx` | C | Per-student lesson manager: assigned list, reorder, unassign, skip, notes | (general) | 31, 33 |
| 44 | `components/teacher/student-card.tsx` | C | Card used in the classroom grid | (general) | 29, 35 |
| 45 | `components/teacher/student-grid.tsx` | C | Server component that renders grid from fetched data | (general) | 44 |
| 46 | `components/teacher/realtime-grid.tsx` | C | Client component wrapping `student-grid` with Realtime subscription | (general) | 45 |
| 47 | `components/teacher/assignment-manager.tsx` | C | Client component for per-student assignment UI (drag-reorder, unassign) | (general) | 31 |
| 48 | `components/teacher/bulk-assign-button.tsx` | C | One-click bulk assign from lesson-picker (≤ 3 clicks SLA) | (general) | 31 |
| 49 | `components/teacher/lesson-picker.tsx` | C | CEFR-filtered lesson browser (virtualized) | (general) | 30 |
| 50 | `components/teacher/notes-panel.tsx` | C | Per-student private teacher notes | (general) | 33 |

### Runtime — student UI deltas

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 51 | `app/(dashboard)/student/layout.tsx` | C | Wrapper that applies `theme-student` scope | (general) | 27 |
| 52 | `app/(dashboard)/student/lessons/page.tsx` | M | Show CEFR filter, render per-student queue (ordered by `order_index`) | (general) | 30, 31 |
| 53 | `components/shared/avatar-display.tsx` | C | `<AvatarDisplay userId={…} />` that resolves signed URL client-side | (general) | 35 |

### Tooling — tests

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 54 | `vitest.config.ts` | C | Vitest config (happy-dom, path aliases) | (general) | — |
| 55 | `playwright.config.ts` | C | Playwright config (baseURL, browsers, trace on retry) | (general) | — |
| 56 | `tests/fixtures/supabase-test-client.ts` | C | Service-role client + seed/cleanup helpers | (general) | — |
| 57 | `tests/unit/gamification/engine.test.ts` | C | Unit tests for level/streak/XP math | (general) | 54 |
| 58 | `tests/unit/content/loader.test.ts` | C | CEFR index lookups | (general) | 54, 30 |
| 59 | `tests/integration/assignments.test.ts` | C | Integration tests for per-student + bulk assign server actions | (general) | 54, 56, 31 |
| 60 | `tests/integration/rate-limit.test.ts` | C | Cold-start + boundary tests for `ai_usage` limiter | (general) | 54, 56, 38 |
| 61 | `tests/e2e/teacher-assigns-lesson.spec.ts` | C | Playwright: login as teacher → assign → student sees | (general) | 55, 31, 42, 43 |
| 62 | `tests/e2e/student-uploads-avatar.spec.ts` | C | Playwright: login as student → upload → teacher sees | (general) | 55, 34 |

### Tooling — config & docs

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 63 | `package.json` | M | Add scripts: `content:run`, `test`, `test:e2e`, `test:all`; add deps: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/dom`, `happy-dom`, `@playwright/test`, `sharp`, `tsx` | (general) | — |
| 64 | `next.config.ts` | M | Exclude `scripts/content/data/` from build | (general) | — |
| 65 | `.env.example` | M | Add `AI_DAILY_MESSAGE_LIMIT`, `CONTENT_PIPELINE_BUDGET_USD`, `CONTENT_GEN_MODEL`, `CONTENT_VALIDATE_MODEL` | (general) | — |
| 66 | `.gitignore` | M | Ignore `scripts/content/data/raw`, `data/chunks`, `data/generated`, `data/validated`, `data/manifests` (keep `.gitkeep`) | (general) | — |
| 67 | `lib/supabase/types.ts` | M | Extend `LessonAssignment` with `student_id`, `order_index`, `status`; add `StudentNote`, `AiUsage` | (general) | 1, 2, 3 |
| 68 | `README.md` | M | V2 section — dual design, content pipeline, tests | @code-documenter | — |
| 69 | `.claude/CLAUDE.md` | M | Correct Next.js version to 16, React 19, note `theme-student`/`theme-teacher` scopes, new KB domains | (general) | — |

**Total Files:** ~69 source files + ~417 generated lesson JSONs = ~486 artifacts.

---

## Agent Assignment Rationale

> Agents discovered from `.claude/agents/` — Build phase invokes matched specialists for content-pipeline and documentation work. The runtime code (Next.js / TS / Supabase) has no specialized agent in the current registry; Build handles those directly.

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| @ai-data-engineer | 9, 10, 38 | Ingest + chunking pipeline; DB-backed rate limiter tuning |
| @ai-prompt-specialist | 11, 12 | Grounded generation + validation prompts |
| @llm-specialist | 5, 7, 13, 14 | Model selection, cost tracking, generation/validation orchestration |
| @python-developer | 6, 8, 15 | Structured schema + I/O tooling (TS-typed but Python-style rigor for data pipelines) |
| @shell-script-specialist | 16 | CLI orchestration with flags and resume |
| @code-documenter | 17, 68 | `scripts/content/README.md` + top-level README v2 section |
| (general) | All runtime, UI, migrations, tests, config | No specialist in the project registry matches Next.js/React/SQL; Build handles directly using KB domains below |

**Agent Discovery:**
- Scanned: `.claude/agents/**/*.md`
- Matched by: File type (content scripts → ai-ml agents; docs → code-documenter), purpose keywords (prompt → ai-prompt-specialist; LLM orchestration → llm-specialist).

**KB Domains consulted during Build:**
- `.claude/kb/supabase/` (migrations, RLS, Storage, Realtime) — for files 1–4, 34–37, 46
- `.claude/kb/genai/` + `.claude/kb/prompt-engineering/` — for files 11–14
- `.claude/kb/testing/` — for files 54–62
- `.claude/kb/architecture/` — for files 27–29 (dual design system)

---

## Code Patterns

### Pattern 1: Additive migration with partial unique indexes (for the assignments extension)

```sql
-- supabase/migrations/002_assignments_v2.sql

ALTER TABLE lesson_assignments
  ADD COLUMN student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN order_index INT NOT NULL DEFAULT 0,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'skipped', 'completed'));

-- Two partial unique indexes: one for classroom-wide, one for per-student.
-- NULLs are distinct in normal unique indexes, so partial is required.
CREATE UNIQUE INDEX uniq_assignment_classroom_wide
  ON lesson_assignments (classroom_id, lesson_slug)
  WHERE student_id IS NULL;

CREATE UNIQUE INDEX uniq_assignment_per_student
  ON lesson_assignments (classroom_id, lesson_slug, student_id)
  WHERE student_id IS NOT NULL;

-- Extend the existing student-read policy so per-student rows are visible to the target student.
DROP POLICY IF EXISTS "Students see classroom assignments" ON lesson_assignments;
CREATE POLICY "Students see their assignments" ON lesson_assignments
  FOR SELECT USING (
    classroom_id IN (
      SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid()
    )
    AND (student_id IS NULL OR student_id = auth.uid())
  );

-- Teacher write policy already covers all writes via assigned_by = auth.uid() (kept).
```

### Pattern 2: Server Action — assign lesson (per-student OR classroom-wide)

```ts
// lib/actions/assignments.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AssignSchema = z.object({
  classroomId: z.string().uuid(),
  lessonSlug: z.string().min(1),
  studentId: z.string().uuid().nullable(), // null => classroom-wide
  orderIndex: z.number().int().min(0).default(0),
});

export async function assignLesson(input: z.input<typeof AssignSchema>) {
  const parsed = AssignSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { error } = await supabase.from("lesson_assignments").insert({
    classroom_id: parsed.classroomId,
    lesson_slug: parsed.lessonSlug,
    student_id: parsed.studentId,
    order_index: parsed.orderIndex,
    assigned_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/teacher/classroom/${parsed.classroomId}`);
  if (parsed.studentId) {
    revalidatePath(
      `/teacher/classroom/${parsed.classroomId}/students/${parsed.studentId}`
    );
  }
  return { success: true as const };
}
```

### Pattern 3: DB-backed rate limiter (cold-start safe)

```ts
// lib/ai/rate-limit.ts
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_DAILY_LIMIT = 20;

export async function checkAndIncrement(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = parseInt(
    process.env.AI_DAILY_MESSAGE_LIMIT ?? String(DEFAULT_DAILY_LIMIT),
    10
  );
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .rpc("increment_ai_usage", { p_user_id: userId, p_window_date: today, p_limit: limit });

  if (error) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: data.allowed, remaining: data.remaining };
}
```

Companion SQL function (in migration `004_ai_usage.sql`):

```sql
CREATE TABLE ai_usage (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON ai_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users upsert own usage" ON ai_usage FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own usage" ON ai_usage FOR UPDATE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID, p_window_date DATE, p_limit INT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO ai_usage (user_id, window_date, count)
  VALUES (p_user_id, p_window_date, 1)
  ON CONFLICT (user_id, window_date)
    DO UPDATE SET count = ai_usage.count + 1, updated_at = now()
    WHERE ai_usage.count < p_limit
  RETURNING count INTO new_count;

  IF new_count IS NULL THEN
    -- Conflict happened but WHERE filtered out; fetch current for response.
    SELECT count INTO new_count FROM ai_usage
      WHERE user_id = p_user_id AND window_date = p_window_date;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', GREATEST(0, p_limit - new_count));
END $$;
```

### Pattern 4: Avatar upload Server Action

```ts
// lib/actions/avatars.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file" };
  if (file.size > MAX_BYTES) return { error: "File too large (max 5 MB)" };
  if (!ALLOWED.includes(file.type as typeof ALLOWED[number])) {
    return { error: "Unsupported type" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const buf = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buf)
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  const path = `${user.id}.webp`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, webp, { contentType: "image/webp", upsert: true });
  if (upErr) return { error: upErr.message };

  await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
  revalidatePath("/student/profile");
  return { success: true };
}
```

### Pattern 5: Storage RLS for `avatars` bucket

```sql
-- supabase/migrations/005_lesson_metadata_and_avatars.sql (partial)

-- Bucket itself (private).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', false)
  ON CONFLICT (id) DO NOTHING;

-- Owner can manage their own object. Path convention: '{user_id}.webp'.
CREATE POLICY "Owner uploads own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND name = auth.uid()::text || '.webp'
  );

CREATE POLICY "Owner updates own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND name = auth.uid()::text || '.webp'
  );

-- Classmates (and teachers of a classroom the student is in) can read signed URLs.
CREATE POLICY "Classmates and teachers read avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1
      FROM classroom_members cm_self
      JOIN classroom_members cm_other ON cm_self.classroom_id = cm_other.classroom_id
      WHERE cm_self.student_id = auth.uid()
        AND cm_other.student_id::text || '.webp' = storage.objects.name
    )
    OR EXISTS (
      SELECT 1
      FROM classrooms c
      JOIN classroom_members cm ON cm.classroom_id = c.id
      WHERE c.teacher_id = auth.uid()
        AND cm.student_id::text || '.webp' = storage.objects.name
    )
    OR (name = auth.uid()::text || '.webp') -- self
  );
```

### Pattern 6: Design tokens as CSS variable scopes

```css
/* app/globals.css (excerpt) */

.theme-student {
  --bg: hsl(250 70% 99%);
  --surface: hsl(250 40% 98%);
  --accent: hsl(142 70% 45%);       /* emerald */
  --accent-2: hsl(262 70% 60%);     /* violet */
  --radius: 0.75rem;
  --density: 1;                     /* line-height / spacing multiplier */
}

.theme-teacher {
  --bg: hsl(220 13% 99%);
  --surface: hsl(220 13% 96%);
  --accent: hsl(215 15% 35%);       /* slate-700 — sober */
  --accent-2: hsl(215 10% 50%);     /* slate-500 */
  --radius: 0.375rem;
  --density: 0.85;
}

.dark .theme-student { /* … */ }
.dark .theme-teacher { /* … */ }
```

```tsx
// app/(dashboard)/teacher/layout.tsx
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-teacher min-h-full">{children}</div>;
}
```

### Pattern 7: Realtime teacher grid (client)

```tsx
// components/teacher/realtime-grid.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StudentGrid, type StudentRow } from "./student-grid";

export function RealtimeGrid({
  classroomId, initial,
}: { classroomId: string; initial: StudentRow[] }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`cls-${classroomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "xp_events", filter: `classroom_id=eq.${classroomId}` },
        (payload) => setRows((prev) => mergeXp(prev, payload))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lesson_progress", filter: `classroom_id=eq.${classroomId}` },
        (payload) => setRows((prev) => mergeProgress(prev, payload))
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [classroomId]);

  return <StudentGrid rows={rows} />;
}
```

### Pattern 8: Content pipeline — generation prompt frame (abbreviated)

```text
# scripts/content/prompts/generate-lesson.md

You are an English-teaching content author for Brazilian Portuguese learners.

## Grounding
The following passages are from open-licensed sources. Use them as factual/linguistic
grounding. Do not invent facts about a source.

<passages>
{{chunks}}
</passages>

## Target
- CEFR sub-level: {{cefr_level}}
- Skill: {{skill}}
- Lesson slug: {{slug}}

## Output
Produce ONE lesson JSON object that conforms to the schema. Every exercise must have:
- id
- type (multiple_choice | fill_blank | matching)
- question or pairs
- correct
- explanation (in English)
- hint_pt_br (in Brazilian Portuguese, short)

Include a `summary_pt_br` field (≤ 240 chars) and a `sources[]` array with {url, title, license}
for every passage above that you drew from.

Return ONLY the JSON object. No prose.
```

### Pattern 9: Zod schema shared between loader and pipeline

```ts
// scripts/content/lib/schema.ts  (re-exported by lib/content/loader.ts)
import { z } from "zod";

export const Exercise = z.discriminatedUnion("type", [
  z.object({
    id: z.string(), type: z.literal("multiple_choice"),
    question: z.string(), options: z.array(z.string()).min(2),
    correct: z.number().int().nonnegative(),
    explanation: z.string(), hint_pt_br: z.string(),
  }),
  z.object({
    id: z.string(), type: z.literal("fill_blank"),
    question: z.string(), correct: z.string(),
    explanation: z.string(), hint_pt_br: z.string(),
  }),
  z.object({
    id: z.string(), type: z.literal("matching"),
    pairs: z.array(z.tuple([z.string(), z.string()])).min(2),
    explanation: z.string(), hint_pt_br: z.string(),
  }),
]);

export const Source = z.object({
  url: z.string().url(),
  title: z.string(),
  license: z.enum(["cc-by", "cc-by-sa", "cc-by-nc", "public-domain"]),
});

export const CefrLevel = z.enum(["a1.1","a1.2","a2.1","a2.2","b1.1","b1.2"]);

export const Lesson = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["grammar","vocabulary","reading","listening"]),
  level: z.enum(["A1","A2","B1"]),
  cefr_level: CefrLevel,
  xp_reward: z.number().int().positive(),
  estimated_minutes: z.number().int().min(5).max(120),
  exercises: z.array(Exercise).min(3),
  summary_pt_br: z.string().optional(),
  sources: z.array(Source).optional(),
  generator_model: z.string().optional(),
  generated_at: z.string().optional(),
});
export type Lesson = z.infer<typeof Lesson>;
```

---

## Data Flow

### Teacher assigns a lesson to one student

```text
Teacher (UI)
  │ click "Assign" in <AssignmentManager>
  ▼
Server Action: assignLesson({ classroomId, studentId, lessonSlug, orderIndex })
  │  Zod validate → Supabase auth check → INSERT lesson_assignments
  ▼
Supabase Postgres
  │  RLS check passes (assigned_by = auth.uid())
  │  Partial unique index prevents duplicate
  ▼
revalidatePath(/teacher/classroom/[id]/students/[studentId])
  │  and RSC re-renders the student view
  ▼
Realtime channel emits (optional): student's open tab refreshes queue
```

### Content generation run (offline)

```text
CLI: npm run content:run -- --cefr a2.1 --skill grammar --budget 2.00
  │
  ▼
fetch-sources.ts
  │  HTTP GET to allow-listed URLs → data/raw/a2-1/grammar/*.html
  ▼
clean-and-chunk.ts
  │  strip HTML → tokenize → CEFR-graded chunk → data/chunks/a2-1/grammar/*.json
  ▼
generate-lessons.ts (Claude Sonnet)
  │  for each chunk group → prompt → JSON → data/generated/a2-1/grammar/{slug}.json
  │  cost-tracker aborts if spend > budget
  ▼
validate-lessons.ts (Claude Haiku + Zod)
  │  schema check + pedagogical spot-check → data/validated/a2-1/grammar/{slug}.json
  ▼
publish-lessons.ts
  │  copy → content/lessons/a2-1/grammar/{slug}.json
  │  rebuild index.json + by-cefr.json
  ▼
manifest.ts  →  scripts/content/data/manifests/{run_id}.json
```

### AI chat request with rate limit

```text
Student POST /api/chat
  │
  ▼
route.ts: auth → checkAndIncrement(supabase, user.id)
  │  calls RPC increment_ai_usage(user_id, today, limit)
  │  atomic upsert + guard: if count >= limit → allowed=false
  ▼
If allowed=false → 429 response, exit
  │
  ▼
streamText(Claude Haiku) → tokens stream to client
  │
  ▼
onFinish: persist user + assistant messages + daily_activity upsert
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-----------------|----------------|
| Supabase Auth | `@supabase/ssr` cookie session | Managed by Supabase Auth |
| Supabase Postgres | `@supabase/supabase-js` client (+ RLS) | User JWT or service-role key (offline tooling only) |
| Supabase Storage | same SDK, `storage.from('avatars')` | User JWT; RLS on `storage.objects` |
| Supabase Realtime | `supabase.channel(...).on('postgres_changes')` | User JWT |
| Anthropic Claude (Haiku, runtime) | `@ai-sdk/anthropic` `streamText` | `ANTHROPIC_API_KEY` (server-only env) |
| Anthropic Claude (Sonnet + Haiku, offline pipeline) | `@ai-sdk/anthropic` `generateText` | `ANTHROPIC_API_KEY` (local env, NOT in Vercel) |
| Open-license sources (BC, VOA, Wikibooks, Project Gutenberg) | HTTP fetch (offline) | None (public) |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| Unit | Gamification engine, content loader, rate-limiter helpers | `tests/unit/**` | Vitest + happy-dom | ≥ 70% for `lib/gamification/*`, `lib/content/*` |
| Integration | Server Actions against a local Supabase test DB | `tests/integration/**` | Vitest + `supabase-test-client` fixture | Key paths for `assignments`, `avatars`, `ai_usage` |
| E2E | Teacher-assigns-lesson end-to-end; student-uploads-avatar end-to-end | `tests/e2e/**` | Playwright against `next dev` + local Supabase | Two Golden Paths |
| Visual diff | Teacher dashboard vs. student dashboard style distinctness | `tests/e2e/visual-diff.spec.ts` | Playwright screenshots | ≥ 30% pixel diff asserted |
| Schema validation | All shipped lesson JSON pass Zod | `tests/unit/content/schema.test.ts` | Vitest | 100% of files valid |
| Perf budget | Bundle size check via `next build` output snapshot | `tests/perf/bundle-size.test.ts` | Vitest | Growth ≤ 20% vs. v1 snapshot |
| Lighthouse | Student + teacher dashboards | Manual `pnpm lighthouse` script | Lighthouse CLI | ≥ 90 perf on mobile profile |

**Out of scope for v2 tests:** mutation testing, contract tests, load tests.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Supabase auth missing | Server Action returns `{ error: "Unauthorized" }`; UI shows toast, redirects to `/login` | No |
| Supabase write error | Propagate `error.message`; UI shows toast; RSC re-fetches to reconcile | No (user-driven) |
| Assignment uniqueness conflict | Catch Postgres `23505` code → return friendly "Already assigned" | No |
| Avatar validation failure (size/type) | Server Action returns `{ error: "…" }`; UI shows inline field error | No |
| Sharp compression throws | Surface as `{ error: "Image processing failed" }`; keep original `avatar_url` unchanged | No |
| Claude API 429 / timeout (runtime) | Return 503 to client; UI shows "try again in a moment" | No (manual) |
| Claude API rate limit (pipeline) | Exponential backoff (5 retries), then skip lesson and log in manifest | Yes (5×) |
| Pipeline budget exceeded | Abort immediately; manifest records remaining work | No (manual `--resume`) |
| Zod schema failure (pipeline validate stage) | Mark lesson as rejected; write rejection reason to manifest; do not publish | No auto; human review |
| Realtime channel disconnect | Reconnect via Supabase SDK; RSC data is authoritative on next page load | Yes (SDK-managed) |

---

## Configuration

| Config Key | Type | Default | Description | Scope |
|------------|------|---------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | — | Supabase project URL | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | — | Supabase anon key | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | string | — | Service role (admin ops, seed, tests) | server + scripts |
| `ANTHROPIC_API_KEY` | string | — | Claude API key | server + scripts |
| `AI_MODEL` | string | `claude-haiku-4-5-20251001` | Runtime tutor model | server |
| `AI_DAILY_MESSAGE_LIMIT` | int | `20` | Per-user daily cap for AI tutor | server |
| `CONTENT_GEN_MODEL` | string | `claude-sonnet-4-6` | Pipeline generation model | scripts |
| `CONTENT_VALIDATE_MODEL` | string | `claude-haiku-4-5-20251001` | Pipeline validation model | scripts |
| `CONTENT_PIPELINE_BUDGET_USD` | float | `5.00` | Hard cost cap per `run.ts` invocation | scripts |
| `CONTENT_PIPELINE_MAX_RETRIES` | int | `5` | Per-lesson retry count on Claude errors | scripts |
| `CONTENT_ALLOWED_SOURCES` | CSV | (see `config.ts`) | Domain allow-list for `fetch-sources.ts` | scripts |

---

## Security Considerations

- **RLS everywhere.** Every new table (`student_notes`, `ai_usage`) and the `lesson_assignments` extension ship with explicit RLS policies; tests assert cross-tenant denial (AT-005 style).
- **Avatars are not publicly enumerable.** Bucket is private; reads go through signed URLs scoped to the requesting user's classrooms (Pattern 5).
- **No service-role key on the client.** Service role is used only by the offline pipeline and the test fixture; never in `app/**`.
- **API key hygiene.** `ANTHROPIC_API_KEY` never leaves server context; `app/api/chat/route.ts` uses it via `@ai-sdk/anthropic` which reads from process.env.
- **Rate-limit atomicity.** The `ai_usage` RPC uses `ON CONFLICT DO UPDATE WHERE` to keep the limit check and increment in a single round-trip, preventing race-condition bypasses.
- **Content pipeline domain allow-list.** `fetch-sources.ts` refuses any URL whose host is not in `CONTENT_ALLOWED_SOURCES` — guards against SSRF-style drift.
- **Schema attack surface on user uploads.** Avatar Server Action enforces MIME + size pre-Sharp; Sharp itself is resistant to known image bombs but we also cap the output dimensions to 512×512.
- **Prompt injection (AI tutor).** Existing system prompt + Claude's native hardening. v2 adds no new surface here.
- **MIT license preserved.** Generated lessons include their source licenses; attribution surfaced in lesson view (COULD goal) for pedagogical + legal clarity.

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging (runtime) | `console.log` with structured `{ event, userId, classroomId, … }` payloads in Server Actions; Vercel captures automatically |
| Logging (pipeline) | `scripts/content/lib/log.ts` writes to stdout + `data/manifests/{run_id}.log` |
| Metrics (runtime) | Rely on Supabase dashboards (queries, RLS denials) and Vercel analytics (free tier) |
| Pipeline cost tracking | `cost-tracker.ts` accumulates per-call tokens; writes per-batch rollup to the run manifest |
| Error surfacing | Server Actions return `{ error }`; UI uses `sonner` (already v1) for toasts |
| Tracing | Not in v2 (out of scope) |

---

## Pipeline Architecture (Content Generation — offline)

### DAG Diagram

```text
[BC / VOA / Wikibooks / PG] ──fetch──▶ [raw/] ──clean──▶ [chunks/]
                                                             │
                                                             ▼
                                                     [Claude Sonnet]
                                                             │
                                                             ▼
                                                     [generated/]
                                                             │
                                                             ▼
                                                     [Claude Haiku + Zod]
                                                             │
                                                             ▼
                                                     [validated/]
                                                             │
                                                             ▼
                                                     [content/lessons/{cefr}/{skill}/]
                                                             │
                                                             ▼
                                               [index.json + by-cefr.json]
                                                             │
                                                             ▼
                                                 [scripts/content/data/manifests/]
```

### Partition Strategy

| Stage Output | Partition Key | Granularity | Rationale |
|--------------|---------------|-------------|-----------|
| `data/raw/` | Source domain → CEFR level | Per-source | Source pages are stable; keep raw fetches cacheable |
| `data/chunks/` | CEFR sub-level + skill | Per-CEFR+skill | Generation prompts are per-cell |
| `data/generated/` | CEFR + skill + slug | Per-lesson | Per-lesson idempotency enables resume |
| `data/validated/` | Same as generated | Per-lesson | Human review is per-file |
| `content/lessons/` | CEFR sub-level + skill | Per-lesson | Git-friendly diffs; aligns with runtime loader |

### Incremental Strategy

| Stage | Strategy | Key | Lookback |
|-------|----------|-----|----------|
| fetch-sources | Skip if `raw/` already has file; `--force` to refresh | URL hash | Infinite (cached) |
| clean-and-chunk | Skip if `chunks/` already has file for URL hash | URL hash | Infinite |
| generate-lessons | Skip if `generated/{slug}.json` exists; `--regen-slug` to override | slug | Per run |
| validate-lessons | Re-run always (cheap) | slug | Per run |
| publish-lessons | Copy-over-write, rebuild index | slug | Per run |

### Schema Evolution Plan

| Change Type | Handling | Rollback |
|-------------|----------|----------|
| Add optional field to `Lesson` | Extend Zod schema; old files still validate | Drop field from schema |
| Required field added | Gated v-bump; write a data-fix script that back-fills before tightening Zod | Revert data-fix commit |
| Exercise type added | Extend discriminated union + UI renderer; no breaking change | Drop new variant |
| Exercise type removed | Deprecate in schema (keep renderer), migrate content, then remove | Re-add renderer |

### Data Quality Gates

| Gate | Tool | Threshold | Action on Failure |
|------|------|-----------|-------------------|
| Zod schema valid | `validate-lessons.ts` + Zod | 100% | Reject lesson, log in manifest |
| `sources[]` non-empty | Zod + custom check | 100% | Reject lesson |
| At least 3 exercises | Zod `.min(3)` | 100% | Reject lesson |
| Distinct exercise types | Custom check | ≥ 2 | Warn (don't block) |
| Budget consumed | `cost-tracker.ts` | ≤ `CONTENT_PIPELINE_BUDGET_USD` | Abort pipeline |
| Library completeness at build time | `tests/unit/content/library.test.ts` | ≥ 420 files, ≥ 60 per CEFR sub-level | Fail test |

---

## Assumption Status (cross-ref from DEFINE)

| ID | Validation Plan for Build |
|----|---------------------------|
| A-001 | Early smoke: generate 10 lessons; measure `.next` output delta. Fail fast if > 50 MB. |
| A-002 | First CEFR-A1.1 batch under human review; if reject rate > 30%, re-tune prompts before continuing. |
| A-003 | Pre-pipeline spike: enumerate BC/VOA/Wikibooks coverage per CEFR cell; add sources if thin. |
| A-004 | Measure avg compressed avatar size on 20 sample uploads; extrapolate. |
| A-005 | Integration test (AT-006) with 100 simulated concurrent requests. |
| A-006 | During Build — wire realtime subscription on `/teacher/classroom/[id]` and confirm via Playwright. |
| A-007 | Visual-diff test in Playwright asserts ≥ 30% pixel difference. |
| A-008 | Confirmed by design of `run.ts --resume`. |
| A-009 | `grep -r 'from "@/lib/ai/rate-limit"'` shows only `app/api/chat/route.ts` — safe to rewrite in place. |
| A-010 | Lighthouse gate in `tests/perf/lighthouse.spec.ts`. If < 90, code-split `realtime-grid` behind a dynamic import. |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-16 | design-agent | Initial version from DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md |

---

## Next Step

**Ready for:** `/build .claude/sdd/features/DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md`
