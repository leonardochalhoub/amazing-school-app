-- Allow lesson_progress + xp_events rows without a classroom so that
-- a roster student who isn't in any classroom can still complete
-- lessons (and earn XP / streaks). The classroom link is purely
-- informational here — assignment targeting uses roster_student_id
-- and/or student_id.

alter table public.lesson_progress
  alter column classroom_id drop not null;

alter table public.xp_events
  alter column classroom_id drop not null;

-- Unique key covered (student_id, lesson_slug, classroom_id). When
-- classroom_id is NULL postgres treats each NULL as distinct, so a
-- classroomless student could accidentally insert multiple rows for the
-- same lesson. Replace with a predicate partial-unique index for the
-- nullable case.
drop index if exists lesson_progress_student_id_lesson_slug_classroom_id_key;
alter table public.lesson_progress
  drop constraint if exists lesson_progress_student_id_lesson_slug_classroom_id_key;

create unique index if not exists lesson_progress_unique_with_classroom
  on public.lesson_progress (student_id, lesson_slug, classroom_id)
  where classroom_id is not null;
create unique index if not exists lesson_progress_unique_no_classroom
  on public.lesson_progress (student_id, lesson_slug)
  where classroom_id is null;
