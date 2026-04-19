-- V5.1: Optional end-of-studies date. When NULL the student is still
-- active; when set, the tuition matrix locks every cell after this
-- date so teachers can't accidentally mark debts past the end.
alter table public.roster_students
  add column if not exists ended_on date;

create index if not exists roster_students_ended_idx
  on public.roster_students (teacher_id)
  where ended_on is not null;
