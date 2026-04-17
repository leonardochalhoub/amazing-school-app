-- V2: Private teacher notes per student per classroom.

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student
  ON student_notes (classroom_id, student_id, created_at DESC);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Only the teacher who owns the classroom can read notes about the student.
CREATE POLICY "Teacher reads notes for own classrooms" ON student_notes
  FOR SELECT USING (
    teacher_id = auth.uid()
    AND classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Teacher writes notes for own classrooms" ON student_notes
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
    AND classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Teacher updates own notes" ON student_notes
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teacher deletes own notes" ON student_notes
  FOR DELETE USING (teacher_id = auth.uid());
