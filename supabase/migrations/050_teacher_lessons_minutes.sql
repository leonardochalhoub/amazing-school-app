-- V6.8: teacher_lessons estimated_minutes
--
-- Teacher-authored lessons didn't carry a duration estimate; only
-- the catalogue-shipped lessons had `estimated_minutes` in their
-- JSON meta. Curriculum reports and certificate platform-hour
-- tallies skipped teacher lessons as a result.
--
-- Adding the column here so the lesson builder can expose a
-- number input and downstream aggregators (student curriculum,
-- certificate hours estimate) can sum teacher-authored content too.

alter table public.teacher_lessons
  add column if not exists estimated_minutes integer;
