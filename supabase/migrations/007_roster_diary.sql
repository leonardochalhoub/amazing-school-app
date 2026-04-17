-- V2: Per-student diary/log entries for roster students.
-- Timestamped notes the teacher keeps over time about a specific student.

CREATE TABLE IF NOT EXISTS roster_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_student_id UUID NOT NULL REFERENCES roster_students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  mood TEXT CHECK (mood IS NULL OR mood IN ('great','good','ok','tough','rough')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_diary_student
  ON roster_diary (roster_student_id, entry_date DESC, created_at DESC);

ALTER TABLE roster_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher reads own diary" ON roster_diary
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teacher inserts own diary" ON roster_diary
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teacher updates own diary" ON roster_diary
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teacher deletes own diary" ON roster_diary
  FOR DELETE USING (teacher_id = auth.uid());
