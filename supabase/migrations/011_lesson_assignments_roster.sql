-- V2.5: Allow lesson_assignments to target roster_students directly.
-- At most one of student_id / roster_student_id is set per row; both NULL = classroom-wide.

ALTER TABLE lesson_assignments
  ADD COLUMN IF NOT EXISTS roster_student_id UUID
    REFERENCES roster_students(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lesson_assignments_target_check'
  ) THEN
    ALTER TABLE lesson_assignments
      ADD CONSTRAINT lesson_assignments_target_check
      CHECK (NOT (student_id IS NOT NULL AND roster_student_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignment_roster_student
  ON lesson_assignments (roster_student_id)
  WHERE roster_student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_per_roster_student
  ON lesson_assignments (classroom_id, lesson_slug, roster_student_id)
  WHERE roster_student_id IS NOT NULL;
