# BRAINSTORM: Lesson Content — Year 1 US English

> AI-generated lesson content for the first-year US-English curriculum, illustrated (text + images), targeted at Brazilian Portuguese learners.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | LESSON_CONTENT_V2 |
| **Date** | 2026-04-16 |
| **Author** | brainstorm-agent |
| **Status** | Ready for Define |
| **Builds on** | `DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md` (content pipeline scaffolding already shipped) |

---

## Initial Idea

**Raw input (2026-04-16):**
> "Create content for the first year of an English course for Brazilians. USA English, which is simpler, lessons created by AI, images and texts."

**Context gathered:**
- v2 content pipeline exists at `scripts/content/` (Claude Sonnet generation + Haiku validation + Zod schema).
- Lesson schema supports `sources[]`, `summary_pt_br`, `generator_model`, `generated_at`. Does **not** yet support `images`.
- 8 seed lessons already shipped across all 6 CEFR sub-levels (A1.1–B1.2). Need to produce the full first-year curriculum.
- Storage bucket `avatars` is wired; a new `lesson-images` bucket will be added for illustrations.
- Pipeline currently writes to `content/lessons/{cefr}/{skill}/{slug}.json` — a static JSON tree bundled into the Next.js app.

---

## Scope Decision

| Attribute | Value | Reasoning |
|-----------|-------|-----------|
| **Curriculum range** | CEFR A1.1 → A2.2 (first 4 of 6 sub-levels) | Year 1 realistic ceiling for adult learners with weekly classes. B1 is year 2. |
| **Lesson count** | **60 lessons** (15 per sub-level) | ~1h each → ~60 hours of structured practice, ~matching a typical year-1 syllabus. |
| **Skill distribution per sub-level** | 6 grammar + 5 vocabulary + 4 reading | Grammar carries the heaviest load in year 1; vocabulary secondary; reading to cement. |
| **Target dialect** | **US English** exclusively | Simpler spelling/phonology for Brazilian learners; dominant media exposure. |
| **Exercises per lesson** | 4–6 mixing multiple-choice / fill-blank / matching | Matches existing schema; already validated in seeds. |
| **Images per lesson** | **1 hero + 1 per exercise (5–7 images/lesson)** | Visual memory aid, especially for vocab + readings. |

**Total images:** 60 × 6 ≈ **360 images**.

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | US English only vs. acknowledge UK differences? | **US only.** Mention UK only when directly relevant (e.g., "apartment / flat"). | Simpler, avoids confusion for beginners. |
| 2 | How progressive should the curriculum be? | **Spiral.** Each grammar topic reappears with more complexity across sub-levels. | Vocabulary seeded in A1.1 is reused in A2.2 readings, reinforcing retention. |
| 3 | Image style? | **Warm cartoon / friendly illustration** (consistent with Maria Silva's avatar style — soft palette, rounded shapes, no stock-photo faces). | Matches app's brand; avoids real-person likeness issues; consistent across the 360-image set. |
| 4 | Image per exercise purpose? | **Grounding visual for the question.** E.g., for "She ___ to school" a cartoon girl walking to a school building. | Makes abstract grammar concrete for Brazilian learners. |
| 5 | Storage for images? | **Supabase Storage bucket `lesson-images`, publicly readable, path `{slug}/hero.webp`, `{slug}/ex-{id}.webp`** | Separate bucket keeps RLS simple (public read, service-role write). |
| 6 | How are images referenced in lesson JSON? | **Add optional `hero_image` (string) to Lesson and `image` (string) to Exercise** — both hold the `{slug}/filename.webp` path. Runtime resolves to CDN URL. | Additive schema change, Zod validated. |
| 7 | Teacher-facing UI scope? | **Read/preview only** for v2 (list, filter by CEFR/skill, open to see full content). **No authoring** — that's v3. | Matches the v2 "assignment management, not authoring" principle. |
| 8 | Budget cap? | **$25 hard cap** for the full first-year generation run. | See cost estimate below. |

---

## Cost Estimate (First-year full run)

| Stage | Model | Per-unit | Units | Subtotal |
|-------|-------|----------|-------|----------|
| Text generation | Claude Sonnet 4.6 | ~$0.08 / lesson | 60 | $4.80 |
| Text validation | Claude Haiku 4.5 | ~$0.01 / lesson | 60 | $0.60 |
| Hero image | `gpt-image-1` (OpenAI, standard) | ~$0.04 / image | 60 | $2.40 |
| Exercise images | `gpt-image-1` (OpenAI, standard) | ~$0.04 / image | 300 | $12.00 |
| Retries buffer | — | ~20% | — | $4.00 |
| **Estimated total** | | | | **~$24** |

**Hard cap:** `CONTENT_PIPELINE_BUDGET_USD=25`. Abort if exceeded.

**Cost levers:**
- If too expensive: drop to hero-only (**saves $12**) → ~$12 total.
- Use Gemini Imagen 4 via Vertex AI (~$0.02/img) → **saves $8**, ~$16 total.
- Regenerate failed lessons only (pipeline is idempotent per slug).

---

## Sample / Grounding Inventory

| Source | License | US vs. UK | Role |
|---|---|---|---|
| **VOA Learning English** | Public domain (US gov) | US | ⭐ Primary grounding for readings + vocabulary themes |
| **Project Gutenberg** (simplified Mark Twain, American short stories) | Public domain | US | Cultural readings for A2 level |
| **Wikibooks — English as a Second Language** | CC-BY-SA | Mostly neutral | Secondary grammar reference |
| **CK-12 Flexbooks (US ESL materials)** | CC-BY-NC | US | Exercise patterns reference |
| British Council LearnEnglish | CC-BY-NC | **UK** | **Excluded** — UK dialect not our target |

New allow-list: `learningenglish.voanews.com, www.gutenberg.org, en.wikibooks.org, flexbooks.ck12.org`

---

## Curriculum Map (60 Lessons)

### A1.1 — True beginner (15 lessons)

**Grammar (6):** Verb *to be* · Subject pronouns · Articles (a / an / the) · Present simple (affirm.) · Plurals · *This / that / these / those*
**Vocabulary (5):** Greetings & introductions · Numbers 1–100 · Days, months, seasons · Family members · Colors
**Reading (4):** "My first day in the US" · "A family photo" · "My neighborhood" · "What's in my backpack?"

### A1.2 — High beginner (15 lessons)

**Grammar (6):** Present simple (neg. + question) · Possessives ('s / my / your / his / her) · Present continuous · *There is / there are* · Prepositions of place · Adverbs of frequency
**Vocabulary (5):** Food & drinks · Clothing · Weather · Daily routine · Home & rooms
**Reading (4):** "Breakfast in America" · "Getting around New York" · "A typical school day" · "Shopping at the mall"

### A2.1 — Lower intermediate (15 lessons)

**Grammar (6):** Past simple (regular) · Past simple (irregular) · Past continuous · *Can / could* (ability) · Countable / uncountable + *much / many* · Comparatives
**Vocabulary (5):** Jobs & workplaces · Hobbies & free time · Transportation · Health & body · Emotions
**Reading (4):** "A Saturday at the park" · "My first job" · "An American road trip" · "A visit to the doctor"

### A2.2 — Upper intermediate (15 lessons)

**Grammar (6):** Superlatives · Future with *will* · Future with *going to* · Present perfect (intro) · Modal verbs (*should / must / have to*) · Phrasal verbs (starter set)
**Vocabulary (5):** Travel & vacation · Money & shopping · Technology & phones · Entertainment & media · Food ordering
**Reading (4):** "The American road trip, part 2" · "An email to a friend" · "Thanksgiving dinner" · "Saving money in college"

**Note:** Themes are progressive and recurring. Maria (a recurring character) appears across readings and provides continuity.

---

## Approaches Explored

### Approach A: One hero + one per exercise, gpt-image-1, warm cartoon ⭐ Recommended

**Description:** Text pipeline (Sonnet+Haiku) already built. Add an `illustrate-lessons.ts` stage that generates 1 hero + 1 per exercise using `gpt-image-1`. All images share a **style-locked prompt prefix** ("warm cartoon illustration, soft rounded shapes, pastel palette, flat shading, child-book style") to enforce visual consistency. Images write to `content/lessons/` sidecar directory → uploaded to new `lesson-images` bucket in a publish step.

**Pros:**
- Rich visual learning aids, matches v2 brand
- Image model is production-grade and fast (~5s each)
- Style-locked prefix keeps the 360-image set cohesive
- Existing pipeline already handles resume/budget/manifest

**Cons:**
- Biggest cost: ~$14 for images
- Requires an OpenAI API key (new dependency)
- Style consistency across 360 images needs spot-check

**Why recommended:** Matches user's ask ("images and texts"). Cost is still well under $30. Brand-consistent with existing cartoon avatars.

### Approach B: Hero-only images (no per-exercise)

**Description:** One hero image per lesson (60 total). Exercises stay text-only.

**Pros:**
- Cheap (~$2.40 image cost, ~$12 total)
- Simpler image generation stage

**Cons:**
- Less visual scaffolding for vocabulary/reading learners
- Hero alone feels decorative rather than pedagogical

**Rejected because:** Per-exercise images are the pedagogical unlock for beginners (especially vocabulary).

### Approach C: Generate images on-demand at runtime

**Description:** No batch pipeline; generate image when a student opens a lesson, cache in Storage.

**Pros:**
- No upfront cost
- Freshness (can regenerate if prompt updates)

**Cons:**
- First-open latency (~5s per image)
- Unpredictable user-facing cost
- Complicates caching + idempotency
- Quality control impossible (users see whatever AI produces)

**Rejected because:** Offline batch with QA is the industry standard for this exact use case.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A: One hero + per-exercise, gpt-image-1, warm cartoon style |
| **Recommendation confidence** | High (matches brand, fits budget, matches explicit ask) |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative |
|---|----------|-----------|-------------|
| 1 | Scope = A1.1 → A2.2 × 15 lessons each (60 total) | First year CEFR realistic for adult learners | Extend to B1 (out of year 1 scope) |
| 2 | US English only | Simpler for Brazilian ear, dominant media | Include UK notes (rejected — added complexity) |
| 3 | 1 hero + 1 per exercise (avg. 6 images/lesson) | Visual scaffolding for beginners | Hero-only (rejected) |
| 4 | `gpt-image-1` standard quality | Good quality-per-dollar, fast | Gemini Imagen (kept as cost-saving fallback) |
| 5 | Style-locked prompt prefix | Visual consistency across 360 images | Vary styles per sub-level (rejected — chaos) |
| 6 | New Storage bucket `lesson-images`, public-read | Simple RLS, CDN-cached | Private + signed URLs (overkill for public lesson content) |
| 7 | Additive schema: `Lesson.hero_image?`, `Exercise.image?` | Backwards-compatible, Zod-validated | Major schema bump (rejected) |
| 8 | Teacher UI v2: list + preview only | Matches v2 "assignment, not authoring" | Include authoring (defer to v3) |
| 9 | Budget cap $25 | Covers full run + 20% buffer | Uncapped (reckless) |
| 10 | Recurring character "Maria" in readings | Narrative continuity, reuses her avatar | Generic narrator (less engaging) |
| 11 | Spiral curriculum | Concepts reappear with escalating complexity | Linear (missed reinforcement) |

---

## Features Removed (YAGNI — v2)

| Feature | Reason Removed | Can Add Later? |
|---|---|---|
| Teacher-authored lessons | v2 is assignment-only per shipped DESIGN | v3 |
| Audio per lesson (pronunciation) | Needs separate TTS stage + storage | v3 |
| Per-lesson video | Out of budget / complexity | v4+ |
| Interactive quizzes beyond existing types | Schema already supports 3 types; adding more = UI work | Later |
| Per-student lesson customization | Out of scope for content gen; assignment system handles this | Already shipped in v2 |
| UK English variants | Explicitly excluded by user | Never (for this app) |
| Gamified images (animated) | Static WebP is enough | v4+ |
| Multilingual descriptions beyond PT-BR | Core audience is BR | Later |

---

## Technical Context for /define

| Aspect | Observation | Implication |
|---|---|---|
| Existing pipeline | `scripts/content/` with cost-tracker, manifest, resume | Extend, don't rebuild |
| Schema change | Add `hero_image` and `Exercise.image` (both optional) | Migration not needed (JSON schema only) |
| Storage | New bucket `lesson-images`, public-read | Migration 008 |
| New dependency | OpenAI SDK (`openai` or direct REST) | `package.json` update + env var |
| New env vars | `OPENAI_API_KEY`, `CONTENT_IMAGE_MODEL` | `.env.example` update |
| New stage | `scripts/content/illustrate-lessons.ts` | Mirror generate/validate stage pattern |
| Prompt template | `scripts/content/prompts/illustrate-exercise.md`, `illustrate-hero.md` | Style-locked prefix |
| Teacher UI | `app/(dashboard)/teacher/lessons/` (new route) | List + preview cards |
| CEFR filter | Reuse `CEFR_LEVELS` constant + `by-cefr.json` index | No DB change |

---

## Sample Lesson Shape (after schema addition)

```json
{
  "slug": "a1-1-grammar-verb-to-be",
  "title": "The verb TO BE",
  "cefr_level": "a1.1",
  "category": "grammar",
  "hero_image": "a1-1-grammar-verb-to-be/hero.webp",
  "exercises": [
    {
      "id": "tb-001",
      "type": "multiple_choice",
      "question": "She ___ my sister.",
      "options": ["am", "is", "are", "be"],
      "correct": 1,
      "image": "a1-1-grammar-verb-to-be/ex-tb-001.webp",
      "explanation": "Use 'is' for he / she / it.",
      "hint_pt_br": "Use 'is' para he / she / it."
    }
  ],
  "sources": [
    { "url": "https://learningenglish.voanews.com/...", "title": "VOA — ...", "license": "public-domain" }
  ]
}
```

---

## Incremental Validations

| Section | Recommendation | Status |
|---------|----------------|--------|
| Scope = 60 lessons (A1.1 → A2.2) | 15/sub-level, spiral | ☐ awaiting confirmation |
| Images: 1 hero + 1/exercise | Warm cartoon style | ☐ awaiting confirmation |
| Model: `gpt-image-1` | Fallback: Gemini Imagen | ☐ awaiting confirmation |
| Budget: $25 hard cap | Adjustable | ☐ awaiting confirmation |
| Teacher UI: read/preview only | No authoring in v2 | ☐ awaiting confirmation |

---

## Decisions Finalized (user answers 2026-04-16)

| # | Decision | Final value |
|---|----------|-------------|
| 1 | Generation model | **Use this Claude Code session** — no offline pipeline, no external image model. Claude Opus writes lesson JSON directly into the DB. |
| 2 | Characters | **Invented ecosystem** — see `content/characters.md` (9 recurring characters + shared settings). |
| 3 | Run timing | **Batched by CEFR sub-level** — produce A1.1 (15 lessons), user reviews, then A1.2, etc. Enables iteration without wasted work. |
| 4 | Review workflow | **Human spot-check + edit in-app** — every lesson lands as a draft (`published: false`). Teacher previews, edits, then publishes. Students only see published lessons. |
| 5 | Course metadata | **Yes — tag lessons** with `course_id = "year-1-us-english-2026"`. Enables cohort-wide assignment and future "copy course" flows. |
| 6 | Images | **Deferred** — Claude doesn't generate images natively. Optional `hero_image` and `Exercise.image` stay in schema but unused in v2.5. Can be filled later via a separate image-gen pass. |

---

## Architectural Implication of Decision #4 (edit-in-app)

V2 DESIGN decided "lessons stay as JSON on disk" for free-tier efficiency. But "teacher edits lessons before assigning" requires runtime mutability. Chosen path:

**DB-backed drafts** — New table `lesson_drafts(slug, course_id, cefr_level, category, content jsonb, published, ...)`. Content lives in Postgres; existing static JSON seeds remain authoritative for legacy lessons.

| Lookup order | Source |
|---|---|
| 1. `lesson_drafts.content` where `slug` matches | DB (new, editable) |
| 2. `content/lessons/**/*.json` where `slug` matches | Static JSON (v2 seeds) |

Storage cost: 60 lessons × ~10 KB JSON = ~600 KB. Well within the 500 MB free tier.

---

## Suggested Requirements for /define

### Problem Statement (Revised)

V2 shipped the teacher admin surface + 8 seed lessons. To actually run a course, the platform needs a full-year curriculum. **In this session**, Claude directly produces 60 CEFR-graded US-English lessons (A1.1 → A2.2) tagged with `course_id = year-1-us-english-2026`, populated with a recurring cast of characters (see `content/characters.md`). Lessons land as **drafts in a new DB-backed `lesson_drafts` table**; the teacher previews, edits, and publishes each one. Students only see published lessons. Images are deferred to a later pass.

### Target Users (Draft)

| User | Pain Point Addressed |
|------|----------------------|
| English Teacher | Only 8 seed lessons exist; cannot run a year-long course |
| Brazilian Student (A1–A2) | Limited text-only exercises don't engage visual learners |
| Prospective School | Curriculum coverage is the #1 evaluation criterion |

### Success Criteria (Revised)

- [ ] ≥ 60 lessons stored in `lesson_drafts` table (15 per sub-level A1.1–A2.2)
- [ ] Every lesson passes Zod schema validation (incl. `course_id`, `character_ids`, `published`)
- [ ] Every lesson references ≥ 1 character from `content/characters.md`
- [ ] `course_id = "year-1-us-english-2026"` tagged on all 60
- [ ] Teacher `/teacher/lessons` route lists all lessons with CEFR + skill + course + status filter
- [ ] Teacher can preview any lesson (read-only detail view)
- [ ] Teacher can edit title, description, exercises, hints before publishing
- [ ] Teacher can publish / unpublish with one click
- [ ] Published lessons are assignable via existing assignment flow
- [ ] Unpublished (draft) lessons are invisible to students
- [ ] Existing 8 seed lessons continue to render from static JSON unchanged
- [ ] Images deferred — schema has optional fields but no generation in v2.5

### Out of Scope (Confirmed)

- Teacher authoring UI
- Audio, video, or animated images
- UK English content
- B1 level (year 2)
- Image regeneration UI at runtime
- Student-facing lesson comments / reactions

---

## Tech Stack Deltas

| Layer | V2 | V2.5 (this feature) | Cost |
|-------|-----|---------------------|------|
| Image model | — | **gpt-image-1** | Pay-per-image, one-time |
| Storage bucket | `avatars` | + `lesson-images` (public-read) | Free tier |
| Pipeline stages | fetch → chunk → generate → validate → publish | + **illustrate** between validate and publish | Free |
| Teacher routes | `/teacher`, `/teacher/classroom/[id]`, `/teacher/students/[id]` | + `/teacher/lessons` (list/preview) | Free |
| Lesson schema | `sources?`, `summary_pt_br?` | + `hero_image?`, `Exercise.image?` | Free |

---

## Next Step

User answered the 5 open questions. Moving directly to implementation:

1. ✅ Use this Claude session (no external image model)
2. ✅ Invent a character ecosystem (9 characters, [content/characters.md](../../../content/characters.md))
3. ✅ Batch by CEFR sub-level with review between batches
4. ✅ Draft → human spot-check + edit → publish (DB-backed)
5. ✅ Course tag `year-1-us-english-2026`
6. ✅ Images deferred to a future pass (not in v2.5)

**Architecture shift from v2 DESIGN:** lessons move to a DB-backed `lesson_drafts` table to enable in-app editing. Existing 8 static-JSON seeds keep rendering as-is via fallback lookup.
