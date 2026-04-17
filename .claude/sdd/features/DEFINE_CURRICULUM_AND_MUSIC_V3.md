# Define — Curriculum Spine + Music Module (V3)

> Status: DRAFT for review · 2026-04-17
> Upstream: BRAINSTORM_CURRICULUM_AND_MUSIC_V3.md
> Decisions locked: Path A (metadata + YouTube + excerpts + Letras links),
> 25-song MVP, top-level `/music` route, C2 as Year-3 stretch, AI-drafted
> teacher-reviewed notes, linear ladder progress, suggestive ordering.

---

## R1. Curriculum spine

### R1.1 Three tiers

| Tier             | CEFR span            | Lessons (target) | Route                        |
|------------------|----------------------|------------------|------------------------------|
| Year 1 — Basic   | A1.1 → A2.2          | ~60              | `/teacher/curriculum/year-1` |
| Year 2 — Intermediate | B1.1 → B2.2     | ~60              | `/teacher/curriculum/year-2` |
| Year 3 — Advanced| C1.1 → C1.2 (+C2 stretch) | ~45         | `/teacher/curriculum/year-3` |

### R1.2 Curriculum files

```
content/curriculum/
  year-1-basic.json
  year-2-intermediate.json
  year-3-advanced.json
  conversational/
    business.json
    travel.json
    interviews.json
    debate.json
    (future)...
```

**Schema — tier file** (`year-N-*.json`):
```ts
{
  tier: "basic" | "intermediate" | "advanced",
  cefr_span: string[],                // ["a1.1","a1.2","a2.1","a2.2"]
  units: Array<{
    unit_slug: string,                // "a1-greetings-and-self"
    unit_title_en: string,
    unit_title_pt: string,
    cefr_level: string,               // "a1.1"
    lesson_slugs: string[],           // refs into content/lessons/
    music_slugs?: string[],           // optional refs into content/music/
  }>,
}
```

The tier file is a **pure ordering layer** — no lesson content duplication.
Lessons stay in `content/lessons/{cefr}/{slug}.json` as today.

### R1.3 Teacher UI

- `/teacher/curriculum` — landing page with three tier cards + Conversational grid.
- `/teacher/curriculum/year-[1|2|3]` — one long scrollable page:
  - Tier header with CEFR range and progress count (if filtering by classroom).
  - Units rendered as collapsible sections.
  - Each lesson a pill → click opens assign popover (classroom / student multi-select).
- `/teacher/curriculum/conversational` — grid of topic modules, same assign UX.

### R1.4 Student UI

- `/student/path` — visual ladder Basic → Intermediate → Advanced.
  - Current lesson highlighted.
  - Completed lessons get a checkmark.
  - Locked tiers (user hasn't reached yet) dimmed but visible.
- Existing `/student/lessons` list stays unchanged.

### R1.5 Data model: zero DB migration required

The spine is purely file-based. `lesson_assignments` keeps working as-is.
"Current position on ladder" is derived at render time from
`lesson_progress` + the tier JSON. No new tables.

---

## R2. Music module

### R2.1 Top-level route

- `/teacher/music` — grid of 25 songs, filterable by CEFR + genre.
- `/teacher/music/[slug]` — song detail + assign action + teaching notes.
- `/student/music` — grid of songs the student has been assigned.
- `/student/music/[slug]` — YouTube embed + excerpt exercises + chat tab.

Sidebar gains a "Music" entry alongside Lessons/Chat/Profile.

### R2.2 Song JSON schema (Zod-validated)

See `content/music/songs/as-long-as-you-love-me.json` — treat that as the
canonical reference. Required fields:

```ts
{
  slug: string,
  title: string,
  artist: string,
  year: number,
  album: string,
  genre: string[],                    // ["pop","rock",...]
  cefr_level: string,                 // "a1.1" ... "c1.2"
  difficulty: "easy" | "medium" | "hard",
  tempo: "slow" | "mid" | "fast",
  duration_seconds: number,
  youtube_id: string,                 // official channel / VEVO only
  full_lyrics_url: string,            // Letras.mus.br preferred
  full_lyrics_source: string,         // "Letras.mus.br (licensed)"
  why_this_song: string,              // pedagogical hook, 1-2 sentences
  vocab_hooks: Array<{
    term: string,
    pt: string,
    note: string,
  }>,
  grammar_callouts: string[],
  exercises: Exercise[],              // see R2.3
  teaching_notes_md: string,          // markdown, teacher-facing
  copyright_notice: string,           // boilerplate, see BSB example
}
```

### R2.3 Exercise types (discriminated union)

Four types for MVP. All exercises embed ≤ 6 lines of lyric excerpt with
pedagogical context — never full lyrics.

```ts
type Exercise =
  | {
      type: "listen_and_fill",
      prompt_en: string, prompt_pt: string,
      excerpt_before: string,
      blank_hint: string,
      answer: string,
      excerpt_after: string,
      youtube_start: number,           // seconds
      youtube_end: number,
    }
  | {
      type: "translate_line",
      prompt_en: string, prompt_pt: string,
      excerpt: string,
      model_answer_pt: string,
      teacher_note: string,
    }
  | {
      type: "discussion",
      prompt_en: string, prompt_pt: string,
      target_vocab: string[],
    }
  | {
      type: "spot_the_grammar",
      prompt_en: string, prompt_pt: string,
      expected: Array<{ short: string, full: string }>,
    };
```

### R2.4 Music index

```
content/music/
  index.json          // flat list of 25 song metadata (no exercises) for list views
  songs/
    {slug}.json       // full detail files
```

### R2.5 Initial 25 songs (draft selection)

Target CEFR spread: A1–A2 heavy (Brazilian learners mostly in basic tier),
B1 medium, B2 light, C1 none (too advanced for pop lyric vehicle).

**A1 (easy — simple present, everyday vocab):** 8 songs
- The Beatles — Let It Be
- The Beatles — Here Comes the Sun
- Imagine Dragons — Believer *(optional — higher energy)*
- John Lennon — Imagine
- Adele — Someone Like You
- Ed Sheeran — Perfect
- Coldplay — Yellow
- Bruno Mars — Count on Me

**A2 (simple past, conditionals, modals):** 9 songs
- Backstreet Boys — As Long As You Love Me ✅ seeded
- Queen — We Are the Champions
- Queen — Bohemian Rhapsody (harder but iconic)
- Elton John — Your Song
- Fleetwood Mac — Landslide
- Simon & Garfunkel — The Sound of Silence
- Taylor Swift — Shake It Off
- Ed Sheeran — Thinking Out Loud
- Creedence — Have You Ever Seen the Rain

**B1 (present perfect, phrasal verbs, idioms):** 6 songs
- Oasis — Wonderwall
- Oasis — Don't Look Back in Anger
- Coldplay — Fix You
- Journey — Don't Stop Believin'
- Guns N' Roses — Sweet Child O' Mine
- Bon Jovi — Livin' on a Prayer

**B2 (advanced idioms, narrative tenses, cultural refs):** 2 songs
- Bob Dylan — Blowin' in the Wind
- Eagles — Hotel California

### R2.6 Assignments

Music is assigned the same way as lessons — we **extend the existing
`lesson_assignments` mechanism** instead of forking. Add optional
`music_slug` column? Or encode music slugs with a `music:` prefix in
`lesson_slug`?

**Decision: encode with `music:` prefix.** `lesson_slug = "music:as-long-as-you-love-me"`
means "assign this song". Zero schema change. The render code branches on
the prefix.

### R2.7 AI chat integration

When a student opens `/student/music/{slug}`, the tutor chat receives a
system-prompt prefix:

> You are helping the student learn English through the song
> "{title}" by {artist}. Stay on this song when discussing vocabulary,
> grammar, and meaning. The student's CEFR level is {cefr_level}.

Injected via the existing `/api/chat/route.ts` — add a query param
`?context=music&slug={slug}` and append the prefix on the server.

---

## R3. Non-functionals

- All song JSON must pass a Zod schema check at build time.
- `youtube_id` must be verified-live at seed time (manual — user reviews).
- `full_lyrics_url` must resolve (200 OK) — we don't revalidate at runtime;
  teacher can flag broken links.
- pt-BR translations always alongside EN prompts.
- No lyrics or exercises rendered before the `copyright_notice` field exists.

---

## R4. Out of scope (still)

- Karaoke-style synced lyric highlighting → needs Musixmatch (Path B).
- Audio-only (Spotify embed) → prefer YouTube for visual + subtitle support.
- User-uploaded songs.
- Song-level XP multipliers.

---

## R5. Acceptance (definition of done, V3 MVP)

1. `content/curriculum/year-[1|2|3].json` exist with at least a skeleton of
   units and lesson slugs (lessons themselves not all seeded yet is fine).
2. `content/music/songs/*.json` contains 25 validated files.
3. `/teacher/curriculum` renders all three tiers.
4. `/teacher/music` renders 25-song grid, filterable.
5. `/student/music/{slug}` plays YouTube + runs at least the listen_and_fill + translate_line exercises.
6. Assignments with `music:` prefix resolve correctly in
   `getAssignmentsForStudent` and render on the student's lesson list.
7. `/student/path` ladder shows tier progress (even if most cells are empty).

---

## R6. What this does NOT touch

- AI tutor core (unchanged except the music context injection in R2.7).
- Avatar system (untouched).
- Gamification engine (XP rewards for music assignments follow existing rules).
- Authentication, RLS (untouched).

---

## R7. Cascading changes needed in existing code

- `lib/content/loader.ts` — new loader for curriculum + music JSON.
- `lib/content/schema.ts` — add Zod schemas for tier + song.
- `lib/actions/assignments.ts` — accept `music:` prefix on `lessonSlug`.
- `components/layout/sidebar.tsx` — add "Music" nav item.
- `app/api/chat/route.ts` — accept `?context=music&slug=…` and inject prefix.
