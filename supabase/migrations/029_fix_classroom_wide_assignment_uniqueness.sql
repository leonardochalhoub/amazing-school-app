-- V4.5: The classroom-wide uniqueness index must ignore rows targeted at a
-- roster student (student_id IS NULL, roster_student_id IS NOT NULL) —
-- otherwise only one roster student per classroom can ever receive a given
-- lesson, which breaks per-student assignments.

DROP INDEX IF EXISTS uniq_assignment_classroom_wide;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignment_classroom_wide
  ON lesson_assignments (classroom_id, lesson_slug)
  WHERE student_id IS NULL AND roster_student_id IS NULL;
