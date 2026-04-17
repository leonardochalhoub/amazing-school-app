# BRAINSTORM: English Teaching Platform — V2

> Exploratory session to scope a professional, lightweight v2 on top of the v1 MVP

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM_V2 |
| **Date** | 2026-04-16 |
| **Author** | brainstorm-agent |
| **Status** | Ready for Define |
| **Supersedes** | `BRAINSTORM_ENGLISH_TEACHING_PLATFORM.md` (v1, shipped) |

---

## Initial Idea

**Raw Input:** Make a better version of the existing platform. Keep what works. The teacher surface must feel **sober, professional, data-dense** — visually distinct from the playful student side. Teacher dashboard centers on a **grid of student cards** (photo, name, progress data) with **admin controls for per-student lesson management**. Generate **~400 hours of content** (double a typical first-year English course) using freely available internet sources as grounding. Platform stays lightweight, free, and open source.

**Context Gathered (from v1 state + user direction):**
- v1.0 is live: auth, classrooms, lessons, AI tutor, gamification, EN/PT-BR, dark mode
- 3 seed lessons only (present/past simple, greetings) — content is the biggest gap
- Teacher UI currently reuses the student visual language — no sober/admin register
- Student photos not supported yet (no Supabase Storage)
- No tests, no persistent rate limiting, single 262-line migration
- v1 explicitly deferred "teacher content authoring" — v2 reverses that partially (assignment management, not authoring)
- User emphasized: **maintain what's good**, don't rewrite what works

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Existing stack | Next.js 16 + React 19 + Supabase + Claude Haiku 4.5 | Keep. v2 is evolution, not rewrite |
| Existing schema | Single migration `001_initial_schema.sql` (262 lines) | v2 adds migrations `002_…` onward, no destructive changes |
| Rate limiting | Lives in `lib/ai/` — likely in-memory | Needs DB-backed replacement for serverless correctness |
| Testing | None present | v2 must add test harness (Vitest + Playwright) |
| Content loader | `lib/content/` reads static JSON | Scales to 420 lessons with lazy-load + indexing |
| Storage | Not wired up | Supabase Storage bucket for student avatars (RLS-gated) |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Content generation strategy? | **Hybrid** — LLM scaffolding grounded in open-licensed sources (British Council LearnEnglish, VOA Learning English, Wikibooks, Project Gutenberg simplified) | Need ingestion + generation pipeline + attribution metadata |
| 2 | Content scope & unit? | **6 CEFR sub-levels A1.1 → B1.2 × ~70 lessons each = ~420 lessons**, each ~1h of student time (lesson + exercises + AI practice) | Schema tags lessons by CEFR level + skill; content loader paginates |
| 3 | Teacher admin techniques? | Per-student assignment, bulk assign to class, per-student notes/flags, override order (skip / force redo). **Authoring custom lessons is v3.** | New tables: `lesson_assignments`, `student_notes`; new teacher UI surface |
| 4 | Student photos storage? | **Supabase Storage**, RLS-gated, auto-compressed on upload | Add `avatars` bucket + upload server action + `profiles.avatar_url` |
| 5 | Stack continuity? | **Keep** Next.js 16 + Supabase + Claude. Add Storage, tests, DB-rate-limit, content refactor. | No framework migration, only additive dependencies |
| 6 | Teacher visual language? | **Sober** — slate/zinc palette, dense data tables, no gradients or gamification flourishes. Student side keeps playful/gamified feel. | Two distinct design systems sharing shadcn/ui primitives |
| 7 | Monetization? | Still 100% free, open source, MIT | No payment, no gating |

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Existing lessons | `content/lessons/` | 3 | Present simple, past simple, greetings (A1) — keep, migrate to new schema |
| Target lessons | `content/lessons/` | ~420 | Generated via hybrid pipeline; CEFR A1.1 → B1.2 |
| Open-licensed sources | External | Many | British Council (CC-BY-NC), VOA Learning English (public domain), Wikibooks (CC-BY-SA), Project Gutenberg (public domain) |
| Existing v1 schema | `supabase/migrations/001_initial_schema.sql` | 1 | Baseline — v2 adds migrations, does not break v1 RLS |

**How samples will be used:**
- v1 lessons re-tagged with CEFR sub-level metadata, kept as ground-truth for format
- Open-source passages scraped → cleaned → chunked → fed as grounding context to Claude for lesson generation
- Every generated lesson cites its source(s) in a `sources` field for attribution and review
- Human review pass before publication (can be phased by CEFR level)

---

## Approaches Explored

### Approach A: Evolution — Additive migrations, dual design system, hybrid content pipeline ⭐ Recommended

**Description:** Keep v1 intact. Add migrations `002_storage_avatars.sql`, `003_assignments_notes.sql`, `004_rate_limit.sql`, `005_lesson_metadata.sql`. Build a new `/teacher/*` UI shell with a sober design tokens file (`lib/design/teacher-tokens.ts`) alongside the existing student tokens. Ship a content pipeline (`scripts/content/`) that ingests open sources, generates lessons with Claude, and emits JSON to `content/lessons/`.

**Pros:**
- Zero downtime, no v1 regressions
- Gamification, AI tutor, auth all untouched — "maintain what's good"
- Two design systems in one codebase using shadcn primitives = minimal new CSS
- Content pipeline is offline (not in hot path), costs controlled
- Still free-tier compatible

**Cons:**
- Two design registers means two sets of components for overlapping patterns (cards, tables)
- Content pipeline is a new subsystem to maintain (scripts + prompts + review workflow)
- Migration count grows (small cost)

**Why Recommended:** Matches user's stated preference — evolution not rewrite. Maximum preservation of shipped value. Design-system split is the minimum required to achieve "sober teacher, playful student" without forking the app.

---

### Approach B: Rewrite teacher surface as a separate Next.js route group with its own UI kit

**Description:** Create a `app/(admin)/` route group with an independent UI kit (e.g., Tremor, Mantine Admin, or TanStack Table). Keep the student side on shadcn/ui. Two different component libraries.

**Pros:**
- Maximum visual contrast (different kits = different feel by construction)
- Admin-grade tables and charts out of the box (Tremor)

**Cons:**
- Two UI libraries = larger bundle, more maintenance
- Divergent patterns for shared concerns (forms, modals, toasts)
- "Lightweight" suffers; bundle size grows

---

### Approach C: Move lesson content to the database, build a CMS

**Description:** Migrate the 420 lessons from JSON files into Postgres tables. Build a CMS for editing. Teachers could eventually author here.

**Pros:**
- Single source of truth; queries instead of file loading
- Clear path to teacher authoring (v3)
- Easier to add search, filter, recommendation

**Cons:**
- Supabase free tier is 500MB DB — 420 lessons × few KB each fits, but leaves less headroom for users/progress
- Lessons become runtime dependencies (DB reads per lesson vs. bundled JSON)
- Heavier migration — v1 has static JSON loader
- Not required for v2; deferring keeps v2 lightweight

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A: Evolution — additive migrations, dual design system, hybrid content pipeline |
| **User Confirmation** | 2026-04-16 |
| **Reasoning** | Preserves shipped v1, keeps "lightweight and free" intact, achieves the sober-vs-playful split with minimum complexity, and isolates content generation as an offline pipeline |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Dual design system (teacher = sober/slate, student = playful/gamified) | Matches real UX difference: teachers need data density, students need motivation | Single unified design |
| 2 | Teachers manage assignments, do **not** author custom lessons in v2 | Authoring is a larger surface (editor, validation, preview) — deserves its own phase | Full authoring in v2 |
| 3 | Content generated via hybrid pipeline (LLM + open sources) | Pure LLM hallucinates grammar edge cases; pure curation is slow and scattered | Pure LLM, or pure curation |
| 4 | CEFR A1.1 → B1.2, six sub-levels × ~70 lessons | B1.2 is the realistic ceiling for this kind of platform; beyond that needs richer modalities | Stop at A2, or push to C1 |
| 5 | Student photos use Supabase Storage with RLS | Already in ecosystem, free tier fits, RLS keeps private | External CDN, no photos |
| 6 | Lessons stay as JSON files on disk | Free, versionable in git, fast at build time, zero DB cost | Move to database |
| 7 | Rate limiting moves to Postgres (`ai_usage` table) | Serverless correctness — in-memory resets on cold start | Keep in-memory, or use Upstash Redis |
| 8 | Tests are table stakes for v2 (Vitest unit + Playwright e2e) | v2 expands surface 5×+; manual testing won't scale | Keep manual QA |
| 9 | Every lesson stores a `sources` array with URLs and license | Legal + pedagogical credibility, required for open-source attribution | No attribution |

---

## Features Removed (YAGNI — v2)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Teacher authoring (rich editor, preview, publish flow) | Large standalone surface; v2 focus is assignment management | v3 |
| Voice-based AI conversation | Still expensive, still complex | v3+ |
| Calendar integration (Google Calendar, .ics) | Zoom/Meet links are sufficient | v3+ |
| Cross-classroom leaderboards | Intra-classroom ranking is the social unit | v3+ |
| Advanced analytics (cohort trends, time-on-task charts) | Per-student view in teacher dashboard is enough | v3+ |
| Native mobile apps | Responsive web is fine | v4+ |
| Payment / premium tier | Project is and will remain free | Never |
| Live peer chat / student-to-student messaging | Off-scope, moderation burden | v3+ |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Content hours benchmark (200 std → 400 v2) | ✅ | Approved "double" target | No |
| Teacher dashboard shape (grid of student squares) | ✅ | Confirmed sober + admin feel | No |
| Hybrid content generation strategy | ✅ | Confirmed ("yes") | No |
| CEFR level range A1.1 → B1.2 | ✅ | Confirmed ("yes") | No |
| Stack continuity (no framework swap) | ✅ | Confirmed ("yes") | No |

---

## Suggested Requirements for /define

### Problem Statement (Draft)
v1 shipped a working MVP but the teacher experience looks like a student page in disguise, and the content library is 3 lessons — too thin to run a real course. v2 separates the teacher admin surface into a sober, data-dense dashboard where teachers manage per-student lesson flows, and expands the library to ~400 hours of CEFR-graded content sourced via a hybrid LLM + open-curation pipeline.

### Target Users (Draft)
| User | Pain Point Addressed |
|------|----------------------|
| English Teacher | v1 teacher UI is visually the same as the student UI and has no per-student admin controls |
| Brazilian Student | Only 3 lessons exist — not enough content to progress from beginner to intermediate |
| Prospective Teacher (evaluating platform) | v1 doesn't look "professional" enough for a teacher to adopt it for paying students |

### Success Criteria (Draft)
- [ ] Teacher dashboard visibly distinct from student side (sober palette, dense grid)
- [ ] Teacher can see all students as cards with photo, level, streak, % progress, last activity
- [ ] Teacher can click a student card → per-student lesson manager (assign, unassign, reorder, add notes)
- [ ] Teacher can bulk-assign a lesson to the whole classroom in under 3 clicks
- [ ] Students can upload a profile photo (auto-cropped, RLS-gated)
- [ ] Content library contains ≥ 420 lessons across CEFR A1.1 → B1.2 with source attribution
- [ ] AI rate limit survives serverless cold starts (DB-backed)
- [ ] Vitest unit tests cover gamification engine + assignment logic
- [ ] Playwright e2e covers teacher-assigns-lesson flow end-to-end
- [ ] Lighthouse performance still ≥ 90 on student and teacher dashboards
- [ ] Bundle size growth ≤ 20% vs. v1

### Constraints Identified
- Must not break v1 (additive only — no destructive migrations, no removed features)
- Free tier compatibility preserved (Supabase 500MB / Vercel 100GB-mo)
- Open-licensed content only (attribution required in every lesson)
- Solo developer — content pipeline must be batch-able and resumable
- Content generation API spend capped (budget to be set in Define)

### Out of Scope (Confirmed for v2)
- Teacher-authored custom lessons
- Voice-based AI, calendar integration, cross-classroom features
- Native mobile, payments, peer chat
- Non-English target language (English remains the only language taught)

---

## Tech Stack Summary (V2 Deltas)

| Layer | V1 | V2 Change | Cost |
|-------|-----|-----------|------|
| Frontend | Next.js 16 + React 19 | Same | Free |
| UI | Tailwind + shadcn/ui | Add dual design tokens (student/teacher) | Free |
| Auth | Supabase Auth | Same | Free tier |
| Database | Supabase Postgres | +4 migrations (assignments, notes, rate-limit, lesson metadata) | Free tier |
| Storage | (none) | **New:** Supabase Storage — avatars bucket | Free tier (1GB) |
| Realtime | Supabase Realtime | Extended to teacher dashboard (student progress live) | Free tier |
| AI Tutor | Claude Haiku 4.5 | Same model, **DB-backed rate limit** | Pay-per-use |
| Content gen | (manual) | **New:** offline pipeline — Claude Sonnet for generation, Haiku for validation | One-time spend, capped |
| Testing | (none) | **New:** Vitest + Playwright | Free |
| Hosting | Vercel | Same | Free tier |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 7 |
| Approaches Explored | 3 |
| Features Removed (YAGNI) | 8 |
| Validations Completed | 5 |
| V1 Features Preserved | All (no regressions) |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md`
