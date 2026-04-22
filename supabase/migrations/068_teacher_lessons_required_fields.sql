-- ═════════════════════════════════════════════════════════════════════════════
-- Personalized lessons must carry: skills[], estimated_minutes, xp_award.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Prior to this migration:
--   - `category` TEXT was single-skill and optional.
--   - `estimated_minutes` was optional (nullable).
--   - no XP column existed on teacher_lessons.
--
-- After:
--   - `skills TEXT[]` stores ≥1 skill per lesson (source of truth).
--   - `category` stays for backward-compat — mirrors skills[0] on write.
--   - `estimated_minutes` defaults to 10 and is NOT NULL going forward.
--   - `xp_award` INT ≥ 0, default 15, NOT NULL.
--
-- Existing rows are backfilled: skills[] = [category] when category present,
-- else ['grammar']; estimated_minutes coalesces to 10; xp_award defaults to 15.
-- ═════════════════════════════════════════════════════════════════════════════

-- Ensure the columns we depend on exist (migration 050 may not have run
-- on every environment). IF NOT EXISTS keeps this idempotent.
ALTER TABLE teacher_lessons
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS skills    TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS xp_award  INT    NOT NULL DEFAULT 15
    CHECK (xp_award >= 0);

-- Backfill skills[] from category for any existing rows.
UPDATE teacher_lessons
SET skills = ARRAY[COALESCE(NULLIF(category, ''), 'grammar')]
WHERE (skills IS NULL OR array_length(skills, 1) IS NULL);

-- Coalesce estimated_minutes then lock it down.
UPDATE teacher_lessons
SET estimated_minutes = 10
WHERE estimated_minutes IS NULL;

ALTER TABLE teacher_lessons
  ALTER COLUMN estimated_minutes SET DEFAULT 10,
  ALTER COLUMN estimated_minutes SET NOT NULL;

-- Enforce at least one skill with a CHECK so future inserts can't slip
-- through the ORM with an empty array.
ALTER TABLE teacher_lessons DROP CONSTRAINT IF EXISTS teacher_lessons_skills_non_empty;
ALTER TABLE teacher_lessons
  ADD CONSTRAINT teacher_lessons_skills_non_empty
  CHECK (array_length(skills, 1) IS NOT NULL AND array_length(skills, 1) >= 1);

-- Mirror the same trio on lesson_bank_entries so shared snapshots
-- carry the complete metadata.
ALTER TABLE lesson_bank_entries
  ADD COLUMN IF NOT EXISTS skills   TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS xp_award INT    NOT NULL DEFAULT 15
    CHECK (xp_award >= 0);

ALTER TABLE lesson_bank_versions
  ADD COLUMN IF NOT EXISTS skills   TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS xp_award INT    NOT NULL DEFAULT 15
    CHECK (xp_award >= 0);
