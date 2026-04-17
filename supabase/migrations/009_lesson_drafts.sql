-- V2.5: Editable lesson drafts.
-- Lessons generated in-session by Claude land here, get reviewed/edited
-- by the teacher, then published. Static JSON seeds in content/lessons/**
-- keep working as a fallback for slugs not present in this table.

CREATE TABLE IF NOT EXISTS lesson_drafts (
  slug TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('a1.1','a1.2','a2.1','a2.2','b1.1','b1.2')),
  category TEXT NOT NULL CHECK (category IN ('grammar','vocabulary','reading','listening')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  character_ids TEXT[] NOT NULL DEFAULT '{}',
  generated_by TEXT NOT NULL DEFAULT 'claude-opus',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lesson_drafts_course_level
  ON lesson_drafts (course_id, cefr_level, category);

CREATE INDEX IF NOT EXISTS idx_lesson_drafts_published
  ON lesson_drafts (published, course_id);

ALTER TABLE lesson_drafts ENABLE ROW LEVEL SECURITY;

-- Teachers can see & manage all drafts (single-tenant admin model for now).
CREATE POLICY "Teachers read all drafts" ON lesson_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers insert drafts" ON lesson_drafts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers update drafts" ON lesson_drafts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers delete drafts" ON lesson_drafts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Students see only PUBLISHED lessons, and only if they belong to a classroom
-- that has the lesson assigned (relies on existing lesson_assignments RLS).
CREATE POLICY "Students read published drafts" ON lesson_drafts
  FOR SELECT USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM lesson_assignments a
      JOIN classroom_members m ON m.classroom_id = a.classroom_id
      WHERE a.lesson_slug = lesson_drafts.slug
        AND m.student_id = auth.uid()
        AND (a.student_id IS NULL OR a.student_id = auth.uid())
    )
  );
