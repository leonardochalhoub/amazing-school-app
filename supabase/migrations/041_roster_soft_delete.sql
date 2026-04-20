-- V6.0: Soft-delete roster_students, same pattern as classrooms
-- (migration 040). Deleting a student should tear down only the
-- teacher-student LINK going forward — everything the student did
-- (assignments, XP, lesson completions, AI chats, diary entries,
-- class history, payments) stays on the platform so graphs and
-- historical logs keep showing the student's name.
--
-- Hard DELETE on roster_students would cascade-wipe:
--    lesson_assignments.roster_student_id → CASCADE (assignments gone)
--    student_payments.roster_student_id   → CASCADE (billing gone)
--    roster_diary.roster_student_id       → CASCADE (notes gone)
--    student_history.roster_student_id    → CASCADE (class log gone)
--    student_invitations.roster_student_id → CASCADE (pending gone)
-- …which loses a year's worth of trail on the student. Instead we
-- stamp deleted_at = now() and filter active-roster queries on
-- deleted_at IS NULL. Historical joins still resolve the student's
-- name because the row lives on.
--
-- auth.users side: not touched here. If the student has an auth
-- account they can still log in; the teacher just no longer sees
-- them in their active roster.

alter table public.roster_students
  add column if not exists deleted_at timestamptz;

create index if not exists roster_students_teacher_active_idx
  on public.roster_students (teacher_id)
  where deleted_at is null;

-- Email-per-teacher uniqueness lives in this table. Same treatment
-- as classrooms.invite_code — the constraint should only apply to
-- live rows so a teacher can re-add a student with the same email
-- after an earlier delete.
alter table public.roster_students
  drop constraint if exists roster_students_teacher_email_unique;
create unique index if not exists roster_students_teacher_email_live_idx
  on public.roster_students (teacher_id, lower(email))
  where deleted_at is null and email is not null;
