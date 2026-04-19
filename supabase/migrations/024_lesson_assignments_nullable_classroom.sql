-- Allow classroom-less assignments so teachers can target roster students
-- who aren't in a classroom yet ("direct" assignments).
-- The row still requires at least one concrete target: either a classroom,
-- an auth student, or a roster student — enforced by a check constraint.

alter table public.lesson_assignments
  alter column classroom_id drop not null;

alter table public.lesson_assignments
  add constraint lesson_assignments_target_not_empty
  check (
    classroom_id is not null
    or student_id is not null
    or roster_student_id is not null
  );
