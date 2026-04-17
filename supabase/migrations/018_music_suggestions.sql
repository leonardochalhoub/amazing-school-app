-- V3.3 — Student suggestions to teachers for music content.
--
-- A student can propose edits to a song's sing-along timings or a lyric
-- excerpt, and their teacher(s) review and approve or reject.
--
-- Scope:
--   - sing_along (JSONB) — proposed prompts list; null = no change suggested
--   - lyric_note  (TEXT) — free-form comment about lyrics (e.g. "this line
--     is wrong" or "propose a different chorus cut"). We intentionally do
--     NOT store proposed full lyrics to stay within fair-use.
--
-- On approval:
--   The teacher's own teacher_music_overrides row for the same music_slug
--   inherits the proposed data. Ops stays on the teacher side — student
--   rows never touch overrides directly.

CREATE TABLE IF NOT EXISTS music_suggestions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id      UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  music_slug        TEXT NOT NULL,
  message           TEXT,
  sing_along        JSONB,
  lyric_note        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','accepted','rejected')),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_music_suggestions_teacher_pending
  ON music_suggestions (teacher_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_music_suggestions_student
  ON music_suggestions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_music_suggestions_slug
  ON music_suggestions (music_slug, status);

ALTER TABLE music_suggestions ENABLE ROW LEVEL SECURITY;

-- Student writes their own suggestions and can read them back.
DROP POLICY IF EXISTS "student inserts own" ON music_suggestions;
CREATE POLICY "student inserts own"
  ON music_suggestions FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student reads own" ON music_suggestions;
CREATE POLICY "student reads own"
  ON music_suggestions FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student updates own pending" ON music_suggestions;
CREATE POLICY "student updates own pending"
  ON music_suggestions FOR UPDATE
  USING (student_id = auth.uid() AND status = 'pending')
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

-- Teacher reads suggestions targeted at them.
DROP POLICY IF EXISTS "teacher reads targeted" ON music_suggestions;
CREATE POLICY "teacher reads targeted"
  ON music_suggestions FOR SELECT
  USING (teacher_id = auth.uid());

-- Teacher marks accepted / rejected + sets reviewer_note. They cannot alter
-- the content of the suggestion (sing_along / lyric_note / message) — those
-- stay immutable so the audit trail is honest.
DROP POLICY IF EXISTS "teacher reviews targeted" ON music_suggestions;
CREATE POLICY "teacher reviews targeted"
  ON music_suggestions FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_music_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_music_suggestions_updated_at ON music_suggestions;
CREATE TRIGGER trg_music_suggestions_updated_at
  BEFORE UPDATE ON music_suggestions
  FOR EACH ROW EXECUTE FUNCTION touch_music_suggestions_updated_at();
