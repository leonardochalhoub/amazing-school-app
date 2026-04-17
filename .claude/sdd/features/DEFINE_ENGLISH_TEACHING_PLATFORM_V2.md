# DEFINE: English Teaching Platform — V2

> Evolve the v1 MVP into a professional teaching platform with a sober teacher admin surface, per-student lesson management, student avatars, and a CEFR-graded library of ~420 lessons sourced via a hybrid LLM + open-curation pipeline — without breaking v1.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM_V2 |
| **Date** | 2026-04-16 |
| **Author** | define-agent |
| **Status** | Ready for Design |
| **Clarity Score** | 15/15 |
| **Supersedes Input** | `BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md` |

---

## Problem Statement

v1 shipped a working MVP, but two structural gaps limit real classroom adoption: (1) the **teacher experience visually mirrors the student side** — gamified, playful, lacking the data density a teacher needs to manage a cohort — and (2) the **content library is 3 lessons**, nowhere near enough to run a ~1-year English course. v2 delivers a distinct, sober teacher admin surface with per-student lesson management, and expands the content library to ~400 hours (~420 CEFR-graded lessons A1.1 → B1.2), all without regressing v1's shipped auth, gamification, AI tutor, or student UX.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| English Teacher | Authenticated teacher running one or more classrooms | v1 teacher UI reuses the student visual language; no per-student admin controls (no bulk assign, no reorder, no notes/flags) |
| Brazilian Student (A1–B1) | Authenticated student in a classroom | Only 3 lessons exist — cannot progress beyond beginner/greetings; no profile photo |
| Prospective Teacher (evaluator) | Considering adopting the platform for their students | v1 doesn't look professional enough to replace existing tools; teacher surface feels like a gamified app, not an admin console |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Ship a sober, data-dense teacher dashboard visually distinct from the student side (different design tokens, no gamification flourishes) |
| **MUST** | Teacher can manage lessons per-student (assign, unassign, reorder, skip, add private notes) and bulk-assign to a whole classroom |
| **MUST** | Expand content library to ≥ 420 lessons across CEFR A1.1 → B1.2 with license-safe source attribution |
| **MUST** | Student avatar upload via Supabase Storage, RLS-gated, auto-compressed |
| **MUST** | AI rate limiting survives serverless cold starts (move from in-memory to Postgres-backed) |
| **MUST** | Additive migrations only — zero destructive schema changes, zero v1 regressions |
| **SHOULD** | Test harness in place: Vitest unit tests for core domain logic, Playwright e2e for the teacher-assigns-lesson flow |
| **SHOULD** | Realtime student progress updates surfaced on the teacher dashboard |
| **SHOULD** | Content pipeline is resumable and batch-capable so one solo dev can regenerate a CEFR level overnight |
| **COULD** | Teacher can export a classroom progress report (CSV) |
| **COULD** | Lesson source attribution rendered as a visible, user-facing citation block |

---

## Success Criteria

Measurable outcomes:

- [ ] Teacher dashboard uses a distinct design token set (slate/zinc palette) — automated visual-diff test confirms ≥ 30% pixel difference from student dashboard on equivalent viewports
- [ ] Teacher dashboard renders a grid of student cards showing: photo, name, CEFR level, streak count, % completion of assigned lessons, last-activity timestamp
- [ ] Teacher can open a per-student lesson manager and assign, unassign, reorder, skip, and add a private note, all persisted via Server Actions
- [ ] Teacher can bulk-assign a lesson to an entire classroom in **≤ 3 clicks** from the classroom view
- [ ] Content library contains **≥ 420 lessons** distributed across six CEFR sub-levels (A1.1, A1.2, A2.1, A2.2, B1.1, B1.2), each with a non-empty `sources[]` array
- [ ] Every generated lesson passes an automated validation check (schema valid, sources present, license recorded, exercises well-formed)
- [ ] Student avatar upload succeeds for files ≤ 5 MB, stored in an `avatars` bucket with RLS that only allows the owning student to write and others in the same classroom to read
- [ ] AI rate limiter rejects the (N+1)th request within the configured window **after a simulated cold start** (integration test)
- [ ] Vitest coverage ≥ 70% for `lib/gamification/*` and new `lib/actions/assignments*`
- [ ] Playwright e2e green for: teacher logs in → opens classroom → assigns a lesson → student sees the lesson on their next load
- [ ] Lighthouse Performance ≥ 90 on `/teacher` and `/student` dashboards (mobile profile, production build)
- [ ] Production JS bundle growth ≤ **20%** vs. the v1.0 tag (`next build` size output comparison)
- [ ] `supabase db reset` runs the full migration chain (`001` → `005`) without error on a clean database

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Teacher dashboard is visually distinct | Teacher is logged in | They navigate to `/teacher` | The dashboard renders with the sober token set (slate/zinc, no gamification accents, dense typography) and a grid of student cards |
| AT-002 | Per-student lesson assignment | Teacher is viewing a student card | They click the card and assign `lesson_a2_present_perfect` | The lesson appears in that student's queue, ordered as specified; only that student sees it |
| AT-003 | Bulk assign to classroom | Teacher is viewing a classroom | They click "Assign to all" on a lesson | Every student in the classroom has the lesson assigned within 3 clicks total |
| AT-004 | Student avatar upload | Authenticated student with no avatar | They upload a 2 MB JPEG | Image is compressed, stored in `avatars` bucket, and `profiles.avatar_url` is updated; other classrooms cannot read it |
| AT-005 | Avatar RLS denial | User A uploaded an avatar; User B is in a different classroom | User B queries User A's avatar URL | Supabase returns 403/Not found (RLS blocks) |
| AT-006 | Rate limiter survives cold start | Previous AI calls hit the limit; serverless container is recycled | A new container starts and the same user retries | The (N+1)th request is still rejected (state read from DB, not memory) |
| AT-007 | Content library fully populated | Content pipeline has completed | Production build runs | `content/lessons/**/*.json` count ≥ 420, every file validates against the lesson schema, every file has a non-empty `sources` array |
| AT-008 | V1 regression — student can still chat with AI tutor | Student is logged in post-v2 deploy | They open the AI tutor and send a message | A streamed response is returned exactly as in v1; gamification still awards XP |
| AT-009 | V1 regression — existing lessons still load | Student has progress on v1's 3 lessons | They log in post-migration | Their progress is preserved and the 3 v1 lessons are re-tagged with CEFR metadata, not lost |
| AT-010 | Realtime teacher view | Teacher has the dashboard open; student completes a lesson | Completion event fires | Teacher's view of the student card updates within 5 s without a page reload |
| AT-011 | Additive migration safety | Clean DB with only migration `001` applied | Operator runs `supabase db push` with new migrations `002–005` | All migrations apply in order, no errors, v1 data preserved |
| AT-012 | Lesson attribution present | A generated lesson file is opened | Its JSON is inspected | It contains `sources: [{ url, title, license }]` with a recognized open license (CC-BY, CC-BY-SA, CC-BY-NC, public domain) |
| AT-013 | Authoring attempt blocked | Teacher attempts to reach a lesson-authoring page | They navigate to any authoring route | No such route exists (v2 is assignment-only; authoring deferred to v3) |

---

## Out of Scope

Explicitly **NOT** included in v2:

- **Teacher-authored custom lessons** (rich editor, preview, publish flow) — deferred to v3
- **Voice-based AI conversation** — cost/complexity not justified yet
- **Calendar integration** (Google Calendar, .ics export) — Zoom/Meet links remain sufficient
- **Cross-classroom leaderboards** — intra-classroom ranking is the social unit
- **Advanced analytics** (cohort trends, time-on-task charts) — per-student view is enough
- **Native mobile apps** — responsive web only
- **Payment / premium tier** — project remains free and MIT-licensed
- **Peer messaging / student-to-student chat** — moderation burden, off-scope
- **Non-English target languages** — English remains the only language taught
- **Migration of lesson content into Postgres** — lessons stay as JSON files on disk
- **Framework swap or major version migration** — stack continuity confirmed

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | Additive migrations only (no destructive changes to `001_initial_schema.sql`) | All new tables/columns via `002_…` onward; no rename/drop of existing objects |
| Technical | Supabase free tier: 500 MB DB, 1 GB Storage, 200 concurrent Realtime | Lessons stay on disk (not DB); avatars compressed before upload |
| Technical | Vercel free tier: 100 GB bandwidth/mo | Content served as bundled JSON with lazy-load, not per-lesson fetch |
| Technical | Must use Next.js 16 + React 19 breaking-change APIs (per `AGENTS.md`) | Read `node_modules/next/dist/docs/` before writing routing/server-action code |
| Technical | Open-licensed content only (CC-BY, CC-BY-SA, CC-BY-NC, public domain) | Every lesson must record source URL + license; no scraping of copyrighted text |
| Technical | Lessons are static JSON files in `content/lessons/` (v1 convention) | Content pipeline writes to disk; app reads via `lib/content/` loader |
| Resource | Solo developer | Content pipeline must be resumable (per-lesson idempotent), batchable (per CEFR level), and able to run overnight |
| Resource | Content generation API spend capped (exact budget to be set in Design) | Pipeline tracks per-run cost; aborts if over budget |
| Compliance | MIT license preserved, project stays 100% free | No payment rails, no gating |
| Operational | Zero v1 regressions | All v1 acceptance paths must still pass post-deploy |

---

## Technical Context

> Essential context for Design phase.

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `app/` (Next.js App Router), `lib/`, `components/`, `content/lessons/`, `supabase/migrations/`, `scripts/content/` (new) | Content pipeline is offline tooling under `scripts/content/`, not shipped in the app bundle |
| **New Directories** | `scripts/content/`, `lib/design/` (token exports), `tests/` (Vitest + Playwright) | Content pipeline is separate from the runtime app |
| **Modified Directories** | `app/(dashboard)/teacher/*`, `lib/ai/` (rate limiter), `lib/content/` (CEFR indexing), `components/` (new teacher-register components) | Student components should not need changes beyond avatar display |
| **KB Domains** | `supabase` (Storage + RLS for avatars, new tables), `genai` + `prompt-engineering` (content pipeline prompts, rate limiter), `architecture` (dual design system), `testing` (Vitest + Playwright setup) | Design phase should pull patterns from these four domains |
| **IaC Impact** | New Supabase resources: `avatars` Storage bucket with RLS policies; tables `lesson_assignments`, `student_notes`, `ai_usage`, `lesson_metadata` (names indicative). No Vercel changes. | Migrations `002` → `005` encode the IaC; no Terraform in this repo |
| **Existing Stack (unchanged)** | Next.js 16 + React 19, Supabase (Auth/DB/Realtime), Claude Haiku 4.5 for the tutor, shadcn/ui + Tailwind | No framework or vendor swap |
| **New Dependencies (planned)** | Vitest + Testing Library, Playwright, Sharp (or built-in) for avatar compression, a content-pipeline orchestration script | All additions must fit free tiers and MIT-compatible licenses |
| **Design Tokens** | `lib/design/student-tokens.ts` (existing feel formalized) + `lib/design/teacher-tokens.ts` (new sober register) | Shared shadcn primitives; divergent palettes and density |

---

## Data Contract

> Applicable because the content pipeline is an offline data pipeline producing structured JSON artifacts.

### Source Inventory

| Source | Type | Volume | Freshness | Owner / License |
|--------|------|--------|-----------|-----------------|
| British Council LearnEnglish | Web (HTML) | Hundreds of articles | Static snapshot | British Council (CC-BY-NC) |
| VOA Learning English | Web (HTML) | Thousands of articles | Static snapshot | U.S. Government (public domain) |
| Wikibooks — English as a Foreign Language | Web (HTML) | Dozens of chapters | Static snapshot | CC-BY-SA |
| Project Gutenberg (simplified readers) | Text | Selected works | Static snapshot | Public domain |
| v1 seed lessons | Local JSON | 3 | Frozen | Platform repo (MIT) |

### Schema Contract (Lesson JSON)

| Field | Type | Constraints | PII? |
|-------|------|-------------|------|
| `id` | string (slug) | NOT NULL, UNIQUE across library | No |
| `cefr_level` | enum `A1.1\|A1.2\|A2.1\|A2.2\|B1.1\|B1.2` | NOT NULL | No |
| `skill` | enum `grammar\|vocabulary\|reading\|listening` | NOT NULL | No |
| `title` | string | NOT NULL, ≤ 120 chars | No |
| `summary_pt_br` | string | NOT NULL (Brazilian Portuguese learner hint) | No |
| `estimated_minutes` | integer | NOT NULL, 30–90 | No |
| `exercises` | array of exercise objects | NOT NULL, length ≥ 3 | No |
| `sources` | array of `{url, title, license}` | NOT NULL, length ≥ 1 | No |
| `generated_at` | ISO 8601 timestamp | NOT NULL | No |
| `generator_model` | string | NOT NULL (e.g. `claude-sonnet-4-6`) | No |

### Schema Contract (New Postgres Tables — indicative)

| Table | Key Columns | RLS Principle |
|-------|-------------|---------------|
| `lesson_assignments` | `id`, `student_id`, `classroom_id`, `lesson_id`, `order_index`, `status`, `assigned_by`, `assigned_at` | Teacher of classroom writes; student of that row reads their own rows |
| `student_notes` | `id`, `student_id`, `teacher_id`, `classroom_id`, `body`, `created_at` | Only the author teacher reads/writes; students cannot read |
| `ai_usage` | `user_id`, `window_start`, `count` | Service-role writes; user reads only their own row |
| `lesson_metadata` | `lesson_id`, `cefr_level`, `skill`, `sources_json` | Public read (lessons are public); service-role writes during deploy |

### Freshness SLAs

| Layer | Target | Measurement |
|-------|--------|-------------|
| Content pipeline (offline) | Per-CEFR-level batch completes within a single overnight run (~8 h) | Pipeline logs start/end timestamps per batch |
| `ai_usage` rate-limit state | Consistent within 1 s across concurrent serverless invocations | Cross-invocation integration test |
| Realtime teacher dashboard | Student progress update visible within 5 s | Playwright measurement |

### Completeness Metrics

- 100% of lessons have a non-empty `sources[]` with recognized open license
- 100% of lessons pass schema validation at build time
- ≥ 99% of assignment Server Action invocations complete without a 5xx
- Zero null primary keys across all new tables

### Lineage Requirements

- Every lesson file records its `sources` URLs, titles, licenses, and the `generator_model` used
- Content pipeline emits a run manifest with inputs, prompts, tokens used, and cost per batch
- Impact analysis required before any lesson schema change (breaks the content loader contract)

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | 420 lessons × ~a few KB each will fit comfortably within Vercel build output + Supabase free tier (content stays on disk) | Would need DB-backed content or external CDN; larger migration | [ ] |
| A-002 | Claude Sonnet-grade generation + Haiku-grade validation produces pedagogically usable content with human spot-check rather than full manual edit | Would need much more human-review labor, timeline slips, or fewer lessons | [ ] |
| A-003 | Open-licensed source corpus (BC/VOA/Wikibooks/Gutenberg) covers A1.1 → B1.2 grammar/vocabulary/reading topics with reasonable breadth | Would need to add more sources; some CEFR cells might be thin | [ ] |
| A-004 | Supabase Storage free tier (1 GB) is sufficient for realistic student-avatar volumes after compression (e.g., ≤ 200 KB each) | Would need external image CDN or aggressive eviction | [ ] |
| A-005 | A DB-backed rate limiter with a `(user_id, window_start, count)` row per window is fast enough at our scale without Redis | Would need Upstash Redis or KV, adds a vendor | [ ] |
| A-006 | Next.js 16 + React 19 Server Actions + Realtime on the teacher dashboard can co-exist without SSR/cache pitfalls | Would need client-side fetching fallbacks, more complex state mgmt | [ ] |
| A-007 | Two design-token sets sharing shadcn primitives is enough differentiation to achieve the "sober vs. playful" feel; a separate UI kit is not needed | Would fall back to Approach B (two UI kits, larger bundle) | [ ] |
| A-008 | Content pipeline can be made resumable via per-lesson idempotency (lesson ID = deterministic slug) with a simple run manifest | Would need a proper job queue / orchestrator, more infra | [ ] |
| A-009 | The v1 rate-limit in-memory implementation has no external callers depending on it; it can be replaced in place | Would need a deprecation window and a compatibility shim | [ ] |
| A-010 | Lighthouse ≥ 90 is achievable on the teacher dashboard despite realtime subscriptions and a dense grid (with proper code-splitting + image optimization) | Would need to drop to ≥ 85 or cut realtime from v2 | [ ] |

**Note:** A-001, A-002, A-004, A-005, and A-010 should be spiked during the Design phase (paper-napkin numbers + a small prototype) before committing.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Two concrete gaps named (teacher UX, content volume), grounded in observed v1 state |
| Users | 3 | Three personas with specific pain points each |
| Goals | 3 | MUST/SHOULD/COULD laid out; each goal is non-overlapping and testable |
| Success | 3 | All criteria measurable with explicit thresholds (≥ 420 lessons, ≤ 20% bundle, ≥ 90 Lighthouse, 3-click bulk assign, etc.) |
| Scope | 3 | 11 items explicitly out of scope; clear authoring-is-v3 boundary |
| **Total** | **15/15** | |

---

## Open Questions

Pre-Design items to pin down (none are blockers — they belong in `/design`):

1. **Content budget** — exact USD cap and per-lesson token budget for Sonnet generation + Haiku validation.
2. **Review workflow** — how human spot-check is recorded (reviewer ID? CI check? a `reviewed: true` field in lesson JSON?).
3. **Lesson ID scheme** — `{cefr}-{skill}-{slug}` vs. `{cefr}.{seq}` vs. UUIDs; determines idempotency and URL design.
4. **Realtime scope** — full live-grid updates vs. polling-on-focus; affects Realtime subscription quota use.
5. **Teacher tokens exact palette** — slate-950/zinc-900 accents, typography scale; Design phase owns the final swatch.
6. **Avatar size + format** — WebP-only vs. WebP+JPEG fallback; max dimensions after compression.
7. **Test harness specifics** — Vitest config (`jsdom` vs. `happy-dom`), Playwright browsers matrix.

These do not block `/design`; they will be resolved inside it.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-16 | define-agent | Initial version extracted from `BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md` |

---

## Next Step

**Ready for:** `/design .claude/sdd/features/DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md`
