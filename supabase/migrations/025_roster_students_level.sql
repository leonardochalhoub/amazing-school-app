-- Single CEFR level per student (teacher picks one). Used to display a
-- level flag next to the student's name on both teacher and student UIs.

alter table public.roster_students
  add column if not exists level text
  check (level is null or level in ('a1','a2','b1','b2','c1','c2','y4'));

create index if not exists roster_students_level_idx
  on public.roster_students (teacher_id, level);
