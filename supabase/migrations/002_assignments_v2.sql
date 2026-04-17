-- V2: Extend lesson_assignments with per-student targeting, ordering, and status.
-- Additive only: existing rows (student_id IS NULL) keep classroom-wide semantics.

ALTER TABLE lesson_assignments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'skipped', 'completed'));

-- Partial unique indexes: one row per (classroom, lesson) classroom-wide,
-- or one row per (classroom, lesson, student) per-student.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_classroom_wide
  ON lesson_assignments (classroom_id, lesson_slug)
  WHERE student_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_per_student
  ON lesson_assignments (classroom_id, lesson_slug, student_id)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_student
  ON lesson_assignments (student_id)
  WHERE student_id IS NOT NULL;

-- Update student read policy so a student sees classroom-wide rows AND rows targeted at them.
DROP POLICY IF EXISTS "Students see classroom assignments" ON lesson_assignments;
CREATE POLICY "Students see their assignments" ON lesson_assignments
  FOR SELECT USING (
    classroom_id IN (
      SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid()
    )
    AND (student_id IS NULL OR student_id = auth.uid())
  );

-- Teacher write policy is already FOR ALL USING (assigned_by = auth.uid()) — unchanged.
