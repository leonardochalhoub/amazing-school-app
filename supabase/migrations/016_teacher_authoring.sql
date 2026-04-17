-- V3.1 — Teacher authoring: custom lessons, music personalization, shared bank
--
-- Three tables:
--   teacher_lessons           — freeform lessons authored by a teacher
--   teacher_music_overrides   — per-teacher customization of canonical songs
--   exercise_bank_items       — reusable exercises, optionally public
--
-- RLS model:
--   - Authors have full CRUD on their own rows.
--   - Public bank items are readable by any authenticated user.
--   - Students can read teacher_lessons that are assigned to them
--     (assignment check happens at action layer; this table's RLS allows
--      reads by members of the same classroom — simplification for MVP).

-- =============================================================
-- 1. teacher_lessons
-- =============================================================
CREATE TABLE IF NOT EXISTS teacher_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  cefr_level   TEXT,
  category     TEXT,
  exercises    JSONB NOT NULL DEFAULT '[]'::jsonb,
  published    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_teacher_lessons_teacher
  ON teacher_lessons (teacher_id, updated_at DESC);

ALTER TABLE teacher_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher reads own lessons" ON teacher_lessons;
CREATE POLICY "teacher reads own lessons"
  ON teacher_lessons FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher writes own lessons" ON teacher_lessons;
CREATE POLICY "teacher writes own lessons"
  ON teacher_lessons FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher updates own lessons" ON teacher_lessons;
CREATE POLICY "teacher updates own lessons"
  ON teacher_lessons FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher deletes own lessons" ON teacher_lessons;
CREATE POLICY "teacher deletes own lessons"
  ON teacher_lessons FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can read any published teacher_lesson that's assigned to them.
-- (Assignments use lesson_slug; the student's own RLS on lesson_assignments
--  already gates which assignments they see.)
DROP POLICY IF EXISTS "student reads assigned teacher lessons" ON teacher_lessons;
CREATE POLICY "student reads assigned teacher lessons"
  ON teacher_lessons FOR SELECT
  USING (
    published = true
    AND EXISTS (
      SELECT 1
      FROM lesson_assignments la
      JOIN classroom_members cm ON cm.classroom_id = la.classroom_id
      WHERE la.lesson_slug = 'custom:' || teacher_lessons.slug
        AND cm.student_id = auth.uid()
    )
  );

-- =============================================================
-- 2. teacher_music_overrides
-- =============================================================
CREATE TABLE IF NOT EXISTS teacher_music_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  music_slug   TEXT NOT NULL,
  sing_along   JSONB,       -- null = fall back to canonical song JSON
  exercises    JSONB,       -- null = fall back to canonical
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, music_slug)
);

CREATE INDEX IF NOT EXISTS idx_teacher_music_overrides_teacher
  ON teacher_music_overrides (teacher_id);

ALTER TABLE teacher_music_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher reads own overrides" ON teacher_music_overrides;
CREATE POLICY "teacher reads own overrides"
  ON teacher_music_overrides FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher writes own overrides" ON teacher_music_overrides;
CREATE POLICY "teacher writes own overrides"
  ON teacher_music_overrides FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher updates own overrides" ON teacher_music_overrides;
CREATE POLICY "teacher updates own overrides"
  ON teacher_music_overrides FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher deletes own overrides" ON teacher_music_overrides;
CREATE POLICY "teacher deletes own overrides"
  ON teacher_music_overrides FOR DELETE
  USING (teacher_id = auth.uid());

-- Students can read overrides that apply to a classroom they're in.
DROP POLICY IF EXISTS "student reads classroom overrides" ON teacher_music_overrides;
CREATE POLICY "student reads classroom overrides"
  ON teacher_music_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM classrooms c
      JOIN classroom_members cm ON cm.classroom_id = c.id
      WHERE c.teacher_id = teacher_music_overrides.teacher_id
        AND cm.student_id = auth.uid()
    )
  );

-- =============================================================
-- 3. exercise_bank_items
-- =============================================================
CREATE TABLE IF NOT EXISTS exercise_bank_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  cefr_level   TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  exercise     JSONB NOT NULL,
  is_public    BOOLEAN NOT NULL DEFAULT false,
  uses_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_bank_author
  ON exercise_bank_items (author_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_bank_public
  ON exercise_bank_items (is_public, cefr_level, updated_at DESC)
  WHERE is_public = true;

ALTER TABLE exercise_bank_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "author reads own bank" ON exercise_bank_items;
CREATE POLICY "author reads own bank"
  ON exercise_bank_items FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "anyone reads public bank" ON exercise_bank_items;
CREATE POLICY "anyone reads public bank"
  ON exercise_bank_items FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "author writes bank" ON exercise_bank_items;
CREATE POLICY "author writes bank"
  ON exercise_bank_items FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "author updates bank" ON exercise_bank_items;
CREATE POLICY "author updates bank"
  ON exercise_bank_items FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "author deletes bank" ON exercise_bank_items;
CREATE POLICY "author deletes bank"
  ON exercise_bank_items FOR DELETE
  USING (author_id = auth.uid());

-- =============================================================
-- updated_at triggers (shared helper)
-- =============================================================
CREATE OR REPLACE FUNCTION touch_teacher_authoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_lessons_updated_at ON teacher_lessons;
CREATE TRIGGER trg_teacher_lessons_updated_at
  BEFORE UPDATE ON teacher_lessons
  FOR EACH ROW EXECUTE FUNCTION touch_teacher_authoring_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_music_overrides_updated_at ON teacher_music_overrides;
CREATE TRIGGER trg_teacher_music_overrides_updated_at
  BEFORE UPDATE ON teacher_music_overrides
  FOR EACH ROW EXECUTE FUNCTION touch_teacher_authoring_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_bank_updated_at ON exercise_bank_items;
CREATE TRIGGER trg_exercise_bank_updated_at
  BEFORE UPDATE ON exercise_bank_items
  FOR EACH ROW EXECUTE FUNCTION touch_teacher_authoring_updated_at();
