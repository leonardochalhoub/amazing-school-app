-- ═════════════════════════════════════════════════════════════════════════════
-- Music in the lesson bank.
--
-- Teachers who personalize a canonical song (new timings + lyrics +
-- exercises via teacher_music_overrides) can now share that override to
-- the bank the same way they'd share a personalized lesson.
--
-- Rather than spinning up a parallel music_bank table we extend the
-- existing lesson_bank_entries / _versions / _migrations tables with a
-- `kind` discriminator and a handful of music-specific fields. This
-- keeps the browse UI, sysadmin spread, version history, and auto-sync
-- machinery working for both shapes.
--
-- Shape per kind:
--
--   kind='lesson' (default, existing behaviour)
--     - slug              → unique lesson slug per author
--     - exercises         → ExerciseBlock[] (lesson blocks)
--     - migration.local_lesson_id points to the cloned teacher_lesson
--
--   kind='music'
--     - music_slug        → canonical song slug (e.g. "imagine-john-lennon")
--     - slug              → `music:{music_slug}` so the (author, slug) unique
--                           key still guarantees one entry per (author, song)
--     - exercises         → MusicExercise[] (same JSONB column, different type)
--     - sing_along        → { prompts: SingAlongPrompt[] } override
--     - migration.local_music_slug is used instead of local_lesson_id
--
-- Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE lesson_bank_entries
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'lesson'
    CHECK (kind IN ('lesson', 'music')),
  ADD COLUMN IF NOT EXISTS music_slug TEXT,
  ADD COLUMN IF NOT EXISTS sing_along JSONB;

ALTER TABLE lesson_bank_versions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'lesson'
    CHECK (kind IN ('lesson', 'music')),
  ADD COLUMN IF NOT EXISTS music_slug TEXT,
  ADD COLUMN IF NOT EXISTS sing_along JSONB;

-- Migrations table carries the pointer to the teacher's local copy. For
-- music the copy lives in teacher_music_overrides, keyed by music_slug +
-- teacher_id. We hold the slug directly because overrides have no stable
-- UUID the way teacher_lessons do.
ALTER TABLE lesson_bank_migrations
  ADD COLUMN IF NOT EXISTS local_music_slug TEXT;

-- Partial index: one music bank entry per (author, music_slug).
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_bank_entries_music_unique
  ON lesson_bank_entries (author_id, music_slug)
  WHERE kind = 'music' AND deleted_at IS NULL;

-- Index to filter/sort music-only browse queries cheaply.
CREATE INDEX IF NOT EXISTS idx_lesson_bank_entries_kind_recent
  ON lesson_bank_entries (kind, updated_at DESC)
  WHERE deleted_at IS NULL;
