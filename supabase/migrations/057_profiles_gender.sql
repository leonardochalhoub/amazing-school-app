-- Teacher gender — used only for UI wording ("Professor" vs "Professora"
-- in pt-BR copy) and nothing else. Students already carry gender on
-- roster_students (migration 010 / 012); this column is the teacher
-- equivalent on profiles. Nullable — existing accounts are untouched
-- and fall back to the masculine form until the teacher picks.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('female', 'male'));

COMMENT ON COLUMN profiles.gender IS
  'Optional. Currently only drives pt-BR wording on the teacher profile hero.';
