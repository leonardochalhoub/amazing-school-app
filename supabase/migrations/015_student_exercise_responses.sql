-- V3: Student exercise responses — captures what a student answered on a
-- given lesson/music exercise so teachers can see submissions over time.

CREATE TABLE IF NOT EXISTS student_exercise_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug   TEXT NOT NULL,                 -- raw slug, e.g. "music:as-long-as-you-love-me" or "present-simple"
  exercise_index INT NOT NULL,                 -- position within the lesson's exercises array
  exercise_type TEXT NOT NULL,                 -- "discussion" | "spot_the_grammar" | "translate_line" | "listen_and_fill"
  answer        JSONB NOT NULL,                -- shape varies by type; validated at action layer
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_slug, exercise_index)
);

CREATE INDEX IF NOT EXISTS idx_student_exercise_responses_student
  ON student_exercise_responses (student_id, lesson_slug);

CREATE INDEX IF NOT EXISTS idx_student_exercise_responses_lesson
  ON student_exercise_responses (lesson_slug);

ALTER TABLE student_exercise_responses ENABLE ROW LEVEL SECURITY;

-- A student sees + writes only their own answers.
DROP POLICY IF EXISTS "student reads own responses" ON student_exercise_responses;
CREATE POLICY "student reads own responses"
  ON student_exercise_responses FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student writes own responses" ON student_exercise_responses;
CREATE POLICY "student writes own responses"
  ON student_exercise_responses FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student updates own responses" ON student_exercise_responses;
CREATE POLICY "student updates own responses"
  ON student_exercise_responses FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers read their classroom members' responses (reuses the SECURITY
-- DEFINER helper from migration 008). We allow teachers to see any response
-- from any student who is a member of ANY classroom they own — the filter
-- by classroom happens at the query level (it's cheaper than per-row).
DROP POLICY IF EXISTS "teacher reads classroom responses" ON student_exercise_responses;
CREATE POLICY "teacher reads classroom responses"
  ON student_exercise_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM classroom_members cm
      JOIN classrooms c ON c.id = cm.classroom_id
      WHERE cm.student_id = student_exercise_responses.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION touch_student_exercise_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_exercise_responses_updated_at ON student_exercise_responses;
CREATE TRIGGER trg_student_exercise_responses_updated_at
  BEFORE UPDATE ON student_exercise_responses
  FOR EACH ROW
  EXECUTE FUNCTION touch_student_exercise_responses_updated_at();
