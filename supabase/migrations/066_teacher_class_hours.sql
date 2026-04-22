-- Teacher live-class hours — dedupe classroom-wide expansions.
--
-- Problem: scheduleClassroomClass inserts ONE student_history row
-- per roster student. For a class of 10 students that lasted 50
-- minutes, we get 10 rows × 50 min = 500 min logged against the
-- teacher — the teacher "taught" 8.3 hours instead of 0.83 hours.
--
-- Student hours are fine (each student attended exactly one of
-- those rows). The inflation only hits teacher aggregations.
--
-- Fix: a dedup view `teacher_class_hours_v` that collapses each
-- class into one row per unique (teacher, date, event_time, end_time,
-- classroom). user_real_minutes_v is rewritten to use it for the
-- teacher side while students still read directly from
-- student_history. Plus `teacher_monthly_hours(uuid)` convenience
-- function returning (month, hours) so the /print/curriculum
-- report and any future teacher dashboard can query monthly
-- breakdowns with one call.
--
-- Idempotent: every CREATE uses OR REPLACE.

-- ─── 1. Dedup view ─────────────────────────────────────────────
-- DISTINCT ON collapses duplicate classroom-wide rows. The key is
-- (teacher, date, start, end, classroom) — two classes can't
-- overlap on the same teacher's calendar, so this is safe.
create or replace view public.teacher_class_hours_v as
select distinct on (
  teacher_id,
  event_date,
  coalesce(event_time::text, ''),
  coalesce(end_time::text, ''),
  coalesce(classroom_id::text, '')
)
  id           as source_row_id,
  teacher_id,
  event_date,
  event_time,
  end_time,
  duration_minutes,
  classroom_id,
  cefr_level,
  skill_focus,
  status
from public.student_history
where status = 'Done' and duration_minutes is not null
order by
  teacher_id,
  event_date,
  coalesce(event_time::text, ''),
  coalesce(end_time::text, ''),
  coalesce(classroom_id::text, ''),
  id;

comment on view public.teacher_class_hours_v is
  'One row per unique class taught by a teacher (dedupes classroom-wide student_history expansions). Safe to aggregate by teacher_id.';

-- ─── 2. Rewrite user_real_minutes_v using the dedup view ──────
create or replace view public.user_real_minutes_v as
select
  p.id as user_id,
  coalesce((
    select floor(sum(sh.seconds) / 60.0)::int
    from public.session_heartbeats sh
    where sh.user_id = p.id
  ), 0) as heartbeat_minutes,
  -- Student-side minutes: one row per class they attended.
  coalesce((
    select sum(sh.duration_minutes)::int
    from public.student_history sh
    where sh.student_id = p.id
      and sh.status = 'Done'
      and sh.duration_minutes is not null
  ), 0)
  +
  -- Teacher-side minutes: dedup via teacher_class_hours_v so a
  -- 50-min classroom-wide class counts once, not N times.
  coalesce((
    select sum(tch.duration_minutes)::int
    from public.teacher_class_hours_v tch
    where tch.teacher_id = p.id
  ), 0) as live_class_minutes,
  coalesce((
    select count(*)::int * 15
    from public.lesson_progress lp
    where lp.student_id = p.id
      and lp.completed_at is not null
      and lp.lesson_slug not like 'music:%'
  ), 0) as lesson_minutes,
  coalesce((
    select count(*)::int * 5
    from public.lesson_progress lp
    where lp.student_id = p.id
      and lp.completed_at is not null
      and lp.lesson_slug like 'music:%'
  ), 0) as song_minutes,
  coalesce((
    select floor(sum(se.duration_ms) / 60000.0)::int
    from public.speaking_events se
    where se.student_id = p.id
      and se.duration_ms is not null
  ), 0) as speaking_minutes
from public.profiles p;

-- ─── 3. Monthly-hours helper ───────────────────────────────────
-- Returns one row per month-with-activity for a given teacher,
-- ordered newest first. The curriculum report + future teacher
-- analytics can call this with a single SELECT.
create or replace function public.teacher_monthly_hours(p_teacher_id uuid)
returns table (
  month date,
  hours numeric,
  classes int
)
language sql
stable
as $$
  select
    date_trunc('month', event_date)::date as month,
    round(sum(duration_minutes) / 60.0, 1)::numeric as hours,
    count(*)::int as classes
  from public.teacher_class_hours_v
  where teacher_id = p_teacher_id
  group by date_trunc('month', event_date)
  order by month desc;
$$;

comment on function public.teacher_monthly_hours(uuid) is
  'Monthly breakdown of a teacher''s live-class hours (dedup-aware). Returns {month, hours, classes} per calendar month with recorded Done classes.';

-- ─── 4. Re-run badge award for every teacher ──────────────────
-- The prior user_real_minutes_v overcounted teacher hours, so the
-- hours_* / khaleesi_* / root_of_all_evil badges may have been
-- awarded too early. The function is idempotent (INSERT ON
-- CONFLICT DO NOTHING), so re-running doesn't create duplicates —
-- and nothing is deleted either. Any prematurely-awarded badge
-- stays; future thresholds are now evaluated against corrected
-- minutes.
do $$
declare r record;
begin
  for r in select id from public.profiles where role = 'teacher' loop
    perform public.award_eligible_badges(r.id);
  end loop;
end;
$$;
