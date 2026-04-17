# BUILD REPORT: English Teaching Platform — V2

> Phase 3 — Implementation status of V2 from DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM_V2 |
| **Date** | 2026-04-16 |
| **Author** | build-agent |
| **DESIGN** | [DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md](../features/DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md) |
| **DEFINE** | [DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md](../features/DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md) |
| **Status** | Scaffold complete — awaits `npm install`, migrations apply, and content pipeline execution |

---

## Summary

All 69 source files from the DESIGN file manifest are in place. The v1 surface is untouched at the API level (auth, chat, lessons flow, gamification). V2 adds:

- 4 additive Supabase migrations (`002–005`)
- New `ai_usage` rate-limit RPC + table, DB-backed and cold-start safe
- `lesson_assignments` extended with `student_id`, `order_index`, `status` + partial unique indexes
- `student_notes` table with teacher-only RLS
- `avatars` Storage bucket with owner-write / classmates-and-teacher-read RLS
- Dual design token scopes (`.theme-student`, `.theme-teacher`) sharing shadcn primitives
- Sober teacher admin console with classroom table, student grid, per-student manager, notes panel, bulk assign, lesson picker, realtime subscription
- Student profile page with avatar upload (Sharp → WebP 512×512)
- CEFR-partitioned lesson tree: 8 seed lessons spanning **all six sub-levels** (A1.1 → B1.2), v1's 3 lessons migrated with new fields
- Offline content pipeline in `scripts/content/` — fetch → chunk → generate (Sonnet) → validate (Haiku + Zod) → publish → index rebuild, with budget tracker, manifest, allow-listed sources, retries
- Shared Zod schema (`lib/content/schema.ts`) used by runtime loader, publisher, and pipeline validator
- Vitest harness (unit + integration) + Playwright harness (e2e) + `tests/README.md`
- Docs: README v2 rewrite, `.claude/CLAUDE.md` corrected, this build report

---

## File Manifest — Status

### Migrations (4/4 ✅)

| # | File | Action | Status |
|---|------|--------|--------|
| 1 | `supabase/migrations/002_assignments_v2.sql` | Create | ✅ |
| 2 | `supabase/migrations/003_student_notes.sql` | Create | ✅ |
| 3 | `supabase/migrations/004_ai_usage.sql` | Create | ✅ |
| 4 | `supabase/migrations/005_lesson_metadata_and_avatars.sql` | Create | ✅ |

### Content pipeline (14/14 ✅)

| # | File | Status |
|---|------|--------|
| 5 | `scripts/content/config.ts` | ✅ |
| 6 | `lib/content/schema.ts` (shared w/ pipeline) | ✅ |
| 7 | `scripts/content/lib/cost-tracker.ts` | ✅ |
| 8 | `scripts/content/lib/manifest.ts` | ✅ |
| 9 | `scripts/content/fetch-sources.ts` | ✅ |
| 10 | `scripts/content/clean-and-chunk.ts` | ✅ |
| 11 | `scripts/content/prompts/generate-lesson.md` | ✅ |
| 12 | `scripts/content/prompts/validate-lesson.md` | ✅ |
| 13 | `scripts/content/generate-lessons.ts` | ✅ |
| 14 | `scripts/content/validate-lessons.ts` | ✅ |
| 15 | `scripts/content/publish-lessons.ts` | ✅ |
| 16 | `scripts/content/run.ts` | ✅ |
| 17 | `scripts/content/README.md` | ✅ |
| 18 | `scripts/content/data/.gitkeep` | ✅ |
| — | `scripts/content/lib/log.ts`, `args.ts`, `claude.ts`, `rebuild-index.ts` | ✅ (helpers) |

### Content — lessons (11/11 ✅, ~417 to be generated)

| # | File | Status |
|---|------|--------|
| 19 | `content/lessons/index.json` | ✅ regenerated |
| 20 | `content/lessons/by-cefr.json` | ✅ |
| 21 | `content/lessons/a1-1/grammar/present-simple.json` | ✅ moved + enriched |
| 22 | `content/lessons/a1-1/grammar/past-simple.json` | ✅ moved + enriched |
| 23 | `content/lessons/a1-1/vocabulary/greetings.json` | ✅ moved + enriched |
| + | `content/lessons/a1-2/grammar/present-continuous.json` | ✅ seed |
| + | `content/lessons/a2-1/grammar/past-continuous.json` | ✅ seed |
| + | `content/lessons/a2-2/grammar/present-perfect.json` | ✅ seed |
| + | `content/lessons/b1-1/grammar/conditionals-first.json` | ✅ seed |
| + | `content/lessons/b1-2/grammar/conditionals-second.json` | ✅ seed |
| 25/26 | old flat `content/lessons/grammar/` and `/vocabulary/` | ✅ removed |
| 24 | ~417 generated lessons (a1-1…b1-2, all skills) | ⏳ not built — runs overnight with budget |

### Runtime — design tokens, loader, rate-limiter (6/6 ✅)

| # | File | Status |
|---|------|--------|
| 27 | `app/globals.css` (+ `.theme-student` / `.theme-teacher`) | ✅ |
| 28 | `lib/design/student-tokens.ts` | ✅ |
| 29 | `lib/design/teacher-tokens.ts` | ✅ |
| 30 | `lib/content/loader.ts` | ✅ rewritten w/ CEFR APIs |
| 38 | `lib/ai/rate-limit.ts` | ✅ rewritten to RPC |
| 35 | `lib/supabase/signed-urls.ts` | ✅ |
| 67 | `lib/supabase/types.ts` | ✅ extended |

### Runtime — server actions (7/7 ✅)

| # | File | Status |
|---|------|--------|
| 31 | `lib/actions/assignments.ts` | ✅ |
| 32 | `lib/actions/lessons.ts` | ✅ updated (per-student merge) |
| 33 | `lib/actions/notes.ts` | ✅ |
| 34 | `lib/actions/avatars.ts` | ✅ |
| — | `lib/actions/teacher-dashboard.ts` | ✅ (aggregation helper added beyond manifest) |
| 39 | `app/api/chat/route.ts` | ✅ (swapped to `checkAndIncrement`) |

### Runtime — teacher UI (11/11 ✅)

| # | File | Status |
|---|------|--------|
| 40 | `app/(dashboard)/teacher/layout.tsx` | ✅ |
| 41 | `app/(dashboard)/teacher/page.tsx` | ✅ sober table |
| 42 | `app/(dashboard)/teacher/classroom/[id]/page.tsx` | ✅ student grid + Realtime |
| 43 | `app/(dashboard)/teacher/classroom/[id]/students/[studentId]/page.tsx` | ✅ per-student manager |
| 44 | `components/teacher/student-card.tsx` | ✅ |
| 45 | `components/teacher/student-grid.tsx` | ✅ |
| 46 | `components/teacher/realtime-grid.tsx` | ✅ |
| 47 | `components/teacher/assignment-manager.tsx` | ✅ reorder + unassign + status |
| 48 | `components/teacher/bulk-assign-button.tsx` | ✅ ≤ 3-click path |
| 49 | `components/teacher/lesson-picker.tsx` | ✅ CEFR + skill + search |
| 50 | `components/teacher/notes-panel.tsx` | ✅ |

### Runtime — student UI deltas (4/4 ✅)

| # | File | Status |
|---|------|--------|
| 51 | `app/(dashboard)/student/layout.tsx` | ✅ |
| 52 | `app/(dashboard)/student/lessons/page.tsx` | ✅ CEFR filter added |
| 37 | `app/(dashboard)/student/profile/page.tsx` | ✅ |
| 36 | `components/shared/avatar-uploader.tsx` | ✅ |
| 53 | `components/shared/avatar-display.tsx` | ✅ |
| — | `components/layout/sidebar.tsx` | ✅ Profile link added; teacher label “Classrooms” |

### Tests (9/9 ✅)

| # | File | Status |
|---|------|--------|
| 54 | `vitest.config.ts` | ✅ |
| 55 | `playwright.config.ts` | ✅ |
| 56 | `tests/fixtures/supabase-test-client.ts` | ✅ |
| — | `tests/fixtures/setup.ts` | ✅ |
| 57 | `tests/unit/gamification/engine.test.ts` | ✅ |
| 58 | `tests/unit/content/loader.test.ts` | ✅ |
| — | `tests/unit/content/schema.test.ts` | ✅ (added — validates every shipped lesson against Zod + index/slug sync) |
| — | `tests/unit/ai/rate-limit.test.ts` | ✅ |
| 59 | `tests/integration/assignments.test.ts` | ✅ (skips w/o service role) |
| 60 | `tests/integration/rate-limit.test.ts` | ✅ (skips w/o service role) |
| 61 | `tests/e2e/teacher-assigns-lesson.spec.ts` | ✅ (skips w/o E2E creds) |
| 62 | `tests/e2e/student-uploads-avatar.spec.ts` | ✅ (skips w/o E2E creds) |
| — | `tests/e2e/teacher-vs-student-theme.spec.ts` | ✅ |

### Config & docs (7/7 ✅)

| # | File | Status |
|---|------|--------|
| 63 | `package.json` | ✅ scripts + deps added (`vitest`, `@playwright/test`, `sharp`, `tsx`, `happy-dom`, testing-library, v8 coverage); version bumped to `0.2.0` |
| 64 | `next.config.ts` | ✅ `serverExternalPackages: ["sharp"]` + `outputFileTracingExcludes` scripts/tests |
| 65 | `.env.example` | ✅ extended w/ pipeline + test vars |
| 66 | `.gitignore` | ✅ ignores pipeline working dirs, `/playwright-report`, `/test-results`, `/coverage` |
| 68 | `README.md` | ✅ v2 rewrite |
| 69 | `.claude/CLAUDE.md` | ✅ Next 16 + React 19, dual theme, v2 features |
| — | This build report | ✅ |

---

## What was NOT executed (ops, not build)

These are deliberately deferred to operator action because they require real infrastructure, long runs, or API spend:

1. **`npm install`** — not run (writes to node_modules + lock file). All deps are declared in `package.json`. Run manually.
2. **`supabase db push` / applying migrations 002–005** — not applied. DBA/ops action.
3. **Content pipeline execution (~417 lessons)** — not run. This is hours of Claude Sonnet calls and real USD spend. The pipeline, prompts, budget cap, and resume semantics are all in place. Prepare `scripts/content/targets.json` and run:
   ```bash
   npm run content:run -- --cefr a1.1 --skill grammar --budget 5.00 --resume
   ```
4. **Running the test suites** — not executed here. Commands: `npm test`, `npm run test:e2e`, `npm run test:all`.
5. **Lighthouse / bundle-size measurement** — not automated in v2. The success criterion (Lighthouse ≥ 90, bundle growth ≤ 20%) requires a production build + real measurement.

---

## Deviations from DESIGN

1. **Added `lib/actions/teacher-dashboard.ts`** — this aggregator wasn't in the manifest but is required by the teacher classroom page to assemble `StudentRow[]` (xp sum, completed count, streak, avatar signed URL). It uses the admin service-role client for the read-only aggregation to avoid RLS re-walks.
2. **Added `tests/unit/content/schema.test.ts`** — beyond the manifest; validates every shipped lesson against Zod and enforces `index.json` ↔ filesystem slug sync. Cheap and catches drift.
3. **Added `tests/unit/ai/rate-limit.test.ts`** — unit test for `getDailyLimit` env parsing, complements the integration test.
4. **`LessonPicker` built as a single virtualized-free component** — design mentioned virtualization; for the v2 library size the native `<ul>` in `max-h-80 overflow-y-auto` is adequate. If the library grows past ~1000 rows we'll swap in `react-virtuoso` — a one-file change.
5. **Sidebar modified** — was not in the file manifest but the teacher label changed from "Dashboard" to "Classrooms" and a "Profile" entry was added for students, needed by the avatar upload flow.
6. **BRAINSTORM characterization correction** carried forward: v1's rate limiter was already DB-backed (message-count), not in-memory. V2 still replaces it with the `ai_usage` RPC for atomicity and decoupling — the design rationale stands.

---

## Verification Checklist

Before `/ship`, run these locally:

```text
[ ] npm install
[ ] supabase db push                         # or apply 002-005 in SQL editor
[ ] npm test                                 # Vitest unit + schema validation
[ ] npm run dev                              # visual smoke
    [ ] /login as teacher → /teacher shows sober table
    [ ] Open classroom → student grid renders; theme-teacher scope visible in DOM
    [ ] Click student card → per-student manager loads; assign a lesson
    [ ] Bulk-assign a lesson from classroom page in ≤ 3 clicks
    [ ] /login as student → /student uses playful theme; /student/profile uploads photo
    [ ] AI chat still works; 20-message/day rate limit still reported
    [ ] Realtime: student completes a lesson → teacher grid updates within ~5s
[ ] With service role in .env: npm test             # integration suite runs
[ ] With E2E creds in .env: npm run test:e2e       # e2e suite runs
[ ] Prepare scripts/content/targets.json; run content pipeline against a single CEFR
    [ ] Verify every published lesson passes tests/unit/content/schema.test.ts
[ ] Lighthouse on /student and /teacher (mobile)   # target ≥ 90
[ ] next build                                     # measure bundle growth ≤ 20% vs v1 tag
```

---

## Known Limitations / Follow-ups

- **v2 still only ships 8 lessons.** The 420-lesson milestone is unlocked by running the content pipeline overnight with a funded Anthropic key. The pipeline is deterministic per slug so runs are resumable.
- **No CI yet.** Tests are local-only per DESIGN decision 8. GitHub Actions can be added later without touching runtime code.
- **Rate limiter fail-safe on downstream error.** If the Claude call itself fails after `checkAndIncrement` succeeds, the user still loses that slot for the day. Acceptable tradeoff; noted in DESIGN decision 4.
- **Storage RLS policy is complex.** The classmates-and-teachers read policy uses nested EXISTS queries. Functional but worth monitoring if `classroom_members` grows large; tighten with a custom function if needed.
- **Avatar signed URLs are generated at RSC time with a 1-hour TTL.** Under heavy dashboard refreshes this bumps the Storage API count. If quotas tighten, switch the teacher grid to fetch signed URLs once client-side and cache in React state.

---

## Success Criteria (from DEFINE)

| Criterion | Status |
|-----------|--------|
| Teacher dashboard visibly distinct (≥30% pixel diff) | Scaffold ready; visual-diff test authored; **not executed** |
| Student grid with photo / level / streak / % / last activity | ✅ implemented |
| Per-student lesson manager (assign/unassign/reorder/notes) | ✅ implemented |
| Bulk assign in ≤ 3 clicks | ✅ implemented (classroom → "Assign to all" → pick) |
| Student avatar upload, auto-cropped, RLS-gated | ✅ implemented |
| Library contains ≥ 420 lessons across A1.1–B1.2 | ⏳ pipeline ready; 8 seeds shipped; run to populate |
| AI rate limit survives serverless cold starts | ✅ implemented (DB RPC) |
| Vitest for gamification + assignment logic | ✅ unit + integration authored |
| Playwright e2e teacher-assigns-lesson | ✅ authored |
| Lighthouse ≥ 90 | ⏳ not measured |
| Bundle growth ≤ 20% | ⏳ not measured |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-16 | build-agent | Initial build report — V2 scaffold complete |

---

## Next Step

**Ready for:** `/ship .claude/sdd/features/DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md`

Before shipping:
1. `npm install` locally.
2. Apply migrations 002–005 in Supabase.
3. Run `npm test` and fix any drift.
4. Smoke-test with `npm run dev`.
5. Run a small content-pipeline batch to confirm the end-to-end loop.
