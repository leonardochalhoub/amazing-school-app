-- V2.5: Roster student demographics — age group and preferred pronouns.
-- Used to pick an appropriate default cartoon avatar.

ALTER TABLE roster_students
  ADD COLUMN IF NOT EXISTS age_group TEXT
    CHECK (age_group IS NULL OR age_group IN ('kid','teen','adult')),
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('female','male','other')),
  ADD COLUMN IF NOT EXISTS preferred_name TEXT;

CREATE INDEX IF NOT EXISTS idx_roster_students_age_group
  ON roster_students (age_group)
  WHERE age_group IS NOT NULL;
