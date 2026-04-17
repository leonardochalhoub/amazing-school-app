# Brainstorm — Curriculum Spine + Music Lyrics Module (V3)

> Status: DRAFT — pending user answers on the OPEN QUESTIONS block.
> Author: Claude · 2026-04-17
> Supersedes nothing — extends V2.

---

## 1. Intent (what the user asked for)

Two coupled initiatives:

**A. Curriculum spine.** Restructure the lesson library around a clear 3-year
default course — Basic, Intermediate, Advanced — with Conversational modules
that unlock *after* year 3 and are topic-driven rather than level-driven. The
teacher should be able to see where a student is on the spine, skip ahead,
and compose custom conversational modules on top.

**B. Music module.** Add a first-class "Music" learning mode: 200 well-known,
easy-to-apply rock & pop songs used as listening + vocabulary + translation
exercises. Pt-BR translation side-by-side, clickable lyrics, AI-powered
"why does this line mean that" explainer.

---

## 2. Where we are today (V2 state)

- Lesson library lives on disk under `content/lessons/{cefr_level}/{slug}.json`.
- `by-cefr.json` groups slugs by CEFR sub-level (a1.1 → b1.2 today).
- Only 8 lessons seeded; the offline pipeline (`scripts/content/`) exists but
  has not yet produced the full ~60 A-level library.
- No curriculum concept above CEFR sub-level. No "year" grouping, no
  conversational track, no non-lesson learning modes (chat tutor is standalone).
- `lesson_assignments` table supports per-classroom / per-student / per-roster
  assignment — this is the mechanism we'd extend for Music.

---

## 3. Curriculum spine — proposal

### 3.1 Three years = three tiers, mapped to CEFR

| Year | Label (EN)      | Label (PT-BR)     | CEFR covered | Lessons (target) |
|------|-----------------|-------------------|--------------|------------------|
| 1    | Basic           | Básico            | A1.1 → A2.2  | ~60              |
| 2    | Intermediate    | Intermediário     | B1.1 → B2.2  | ~60              |
| 3    | Advanced        | Avançado          | C1.1 → C1.2 (+C2 intro) | ~45     |

*Rationale for CEFR mapping:* CEFR A-level to independent-user (B) to
proficient-user (C) is the standard Cambridge/Brazilian-school ladder.
C2 in a single year is unrealistic — treat C2 as "graduation + ongoing
conversational" rather than a fourth tier.

### 3.2 Conversational track (post-year-3)

After Advanced, learners enter **Conversational**, which is NOT a linear
track. It's a **library of topic modules** the teacher picks from or builds:
- "Business meetings"
- "Travel: airports, hotels, restaurants"
- "Interviews"
- "Everyday small talk"
- "Debate & opinion"
- "Movies & pop culture"
- "Music" (the new module — see §4)

Each topic module is a small cluster of lessons + a tutor persona hint for
the AI chat. The tutor pivots to that topic when the student opens a module.

### 3.3 Data model change (minimal)

Today `content/lessons/{cefr}/…` drives everything. Proposal:

```
content/
  curriculum/
    year-1-basic.json      # ordered list of cefr_levels + slugs
    year-2-intermediate.json
    year-3-advanced.json
    conversational/
      business.json
      travel.json
      music.json           # references the Music module (§4)
      ...
  lessons/                 # unchanged — the physical content
  music/                   # NEW — see §4
```

`curriculum/*.json` is an *ordering layer* on top of the existing lesson
files. Zero schema change to `lesson_assignments` — we assign the same way,
we just have a new UI surface that lets teachers scroll the spine.

### 3.4 UI surface (teacher)

- `/teacher/curriculum` — a single long page showing the 3-year spine as a
  track, each tier collapsible, each lesson as a pill. Click a pill →
  "Assign to…" popover (classroom / student).
- `/teacher/curriculum/conversational` — grid of topic modules.
- Existing `/teacher/lessons` stays; it becomes "All lessons (flat)".

### 3.5 UI surface (student)

- `/student/path` — visual progress along Basic → Intermediate → Advanced,
  with their current lesson highlighted. This replaces nothing; it sits
  alongside the existing `/student/lessons` list.

---

## 4. Music module — proposal

### 4.1 Scope

200 songs, rock + pop, chosen for pedagogical value:
- Clear, slow-to-moderate enunciation (rules out heavy rap, screaming vocals).
- Vocabulary mapped to CEFR levels so a song can be tagged "A2+" or "B1+".
- Cultural weight — songs Brazilian learners already half-know (Beatles,
  Queen, Adele, Coldplay, Oasis, Guns N' Roses, Creedence, Simon & Garfunkel,
  Fleetwood Mac, Lennon solo, Bon Jovi, Journey, ABBA, Taylor Swift's
  plainer lyrics, Ed Sheeran, etc.).

### 4.2 ⚠️ Copyright — READ THIS BEFORE BUILDING

**Reproducing full lyrics of copyrighted songs without a license is not legal
in BR or the US.** Three viable paths, from cheapest to safest:

**Path A — Metadata + short educational excerpts + official YouTube (FREE, lawful).** *(CHOSEN 2026-04-17)*
Store song metadata (title, artist, year, pedagogical tags, CEFR vocab
hooks, pre-written teaching notes). Embed official / VEVO-verified YouTube
videos. Reproduce only 2–6 lines per song inside exercises with pedagogical
commentary (Brazilian Lei 9.610/98 art. 46 VIII "citação para fins didáticos"
+ US fair-use doctrine). Link to a licensed source (Letras.mus.br, Genius)
for the full text.
→ *Pros:* legal, zero cost, fast to ship, students hear the real song.
→ *Cons:* we can't print full lyrics as a reading document — only short
excerpts inside exercises. YouTube link rot (handled by preferring official channels).

**YouTube sourcing rule:** `youtube_id` must point to the artist's official
channel or a VEVO-verified upload. Random re-uploads are banned — they get
taken down and break the module.

**Path B — LyricFind / Musixmatch API (PAID, lawful, good UX).**
License lyrics via an aggregator. LyricFind powers Spotify, iHeart, etc.
Pricing typically $0.001–0.003 per lyric fetch or a flat monthly fee at
our scale. We can display full lyrics inside the app.
→ *Pros:* legal, full UX, translations allowed (fair-use for education
is stronger when combined with a license).
→ *Cons:* cost, API integration, usage caps, attribution required.

**Path C — Public domain / Creative Commons songs only (FREE, lawful, tiny catalog).**
Folk standards, traditional songs, pre-1928 US works, artists who CC-licensed
their catalog (Nine Inch Nails' *Ghosts I–IV*, some Radiohead live material).
→ *Pros:* legal, free.
→ *Cons:* the catalog is ~20 songs, not 200, and few will match "known rock/pop".

**My recommendation:** Ship **Path A** first (metadata catalog + YouTube
+ AI-generated teaching notes). Upgrade to Path B if engagement data
justifies the license cost.

### 4.3 Data model (if Path A)

```
content/music/
  index.json               # flat list of 200 songs with metadata
  songs/
    {slug}.json            # per-song: artist, title, year, youtube_id,
                           #   cefr_level, vocab_hooks[], teaching_notes,
                           #   discussion_prompts[], grammar_callouts[]
```

Example `songs/imagine-lennon.json`:
```json
{
  "slug": "imagine-lennon",
  "title": "Imagine",
  "artist": "John Lennon",
  "year": 1971,
  "cefr_level": "a2.2",
  "genre": ["rock", "soft-rock"],
  "youtube_id": "YkgkThdzX-8",
  "difficulty": "easy",
  "tempo": "slow",
  "duration_seconds": 183,
  "vocab_hooks": [
    { "term": "imagine",  "pt": "imaginar",  "note": "verb, A1 frequency" },
    { "term": "heaven",   "pt": "paraíso",   "note": "abstract noun, A2" }
  ],
  "grammar_callouts": ["imperative mood", "conditional softening"],
  "teaching_notes_md": "This song is a full study of the imperative + …",
  "discussion_prompts": [
    "What does Lennon ask you to imagine?",
    "Is this song political? Why or why not?"
  ]
}
```

### 4.4 UI surface

**Teacher:**
- `/teacher/music` — searchable grid of 200 songs, filterable by CEFR,
  genre, artist, year. Assign song to a classroom/student like any lesson.
- Pre-class preview: listen, read teaching notes, see suggested discussion
  prompts.

**Student:**
- `/student/music/{slug}` —
  - Top: YouTube embed.
  - Middle: lyrics (Path A: "View on Genius" link only; Path B: inline).
  - Side: AI-generated pt-BR gloss of each line, toggleable.
  - Bottom: 3-5 Duolingo-style exercises generated from the song's vocab
    hooks (e.g., fill-the-blank with the actual lyric line, multi-choice
    on idioms).
  - Tutor tab: pre-seeded AI chat with the song's discussion prompts.

### 4.5 Building the 200-song catalog

Options:
- **Curate by hand.** Seed 40–50 songs now, iterate based on teacher feedback.
  Realistic MVP.
- **AI-assist.** Prompt Sonnet 4.6 to propose 200 candidates in the offline
  pipeline, then human review each for pedagogy + copyright safety
  (Path A only needs artist/title/year — Genius link is fetched at render
  time, so no lyric storage).
- **Mixed.** AI proposes, teacher approves in bulk via a new admin page.

My recommendation: **start with 25 hand-curated songs** (Beatles x5, Queen
x3, Adele x3, Oasis x2, Coldplay x3, Ed Sheeran x2, Creedence x2,
Simon & Garfunkel x2, Fleetwood Mac x2, Taylor Swift's simpler tracks x1).
Ship the UI, test teaching flow, then decide whether to push to 200.

---

## 5. Things that stay out of scope (V3)

- Speech recognition / pronunciation scoring → V4.
- Real-time karaoke-style synced lyrics (Path B required + extra engineering).
- User-uploaded songs.
- Paid tier / billing for the music catalog.

---

## 6. Open questions (please answer before /define)

1. **Copyright path — A, B, or C?** This gates everything else. My strong
   recommendation is A (metadata + YouTube) for MVP.
2. **Curriculum ordering authority.** Should the spine be *prescriptive*
   (every learner follows it in order) or *suggestive* (teachers can
   reorder freely, with the spine as a default)? I'd default to suggestive.
3. **CEFR C2 treatment.** Fold into year 3 as stretch content, or leave
   for a future "Year 4: Mastery"?
4. **Music catalog size for MVP.** 25 curated (my rec), 50, or push for 200
   on day one?
5. **Who writes the teaching notes?** AI-generated + teacher-reviewed
   (matches V2 philosophy), or hand-written by you for the first batch?
6. **Student-facing progress visualization.** Linear ladder, tree/map
   (Duolingo-style), or a simple checklist? Affects design time.
7. **Does Music exist inside Conversational, or as a top-level track
   alongside Curriculum?** I've modeled it as a Conversational topic, but
   it could equally be "Music" in the sidebar at the same level as "Lessons".

---

## 7. Proposed next steps

Once you answer §6, I'll:

1. Write `DEFINE_CURRICULUM_AND_MUSIC_V3.md` (concrete requirements + schemas).
2. Write `DESIGN_CURRICULUM_AND_MUSIC_V3.md` (routes, components, DB, pipeline).
3. Seed the `content/curriculum/` + `content/music/` directories with the
   first batch so we can see it working.
4. Build the teacher `/curriculum` and `/music` pages end-to-end.

Estimated effort (after answers): ~2–3 sessions to ship curriculum spine,
~2 sessions to ship Music MVP at 25 songs.
