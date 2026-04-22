-- Backfill XP for historical completions that were recorded before
-- the teacher XP path was wired (and any student completions that
-- somehow slipped through without a matching xp_events row).
--
-- The class of bug:
--   - lesson_progress rows exist with completed_at IS NOT NULL
--   - no corresponding xp_events row was ever written
--   - so total_xp reads 0, level stays 1, badges never unlock
--
-- This migration:
--   1. Scans lesson_progress for every non-null completed_at and
--      inserts a default 25 XP xp_events row when missing (teacher
--      or student — doesn't matter who completed it, only that the
--      completion is on record).
--   2. Does the same for student_history rows with status='Done':
--      grants the per-class xp_reward (default 30) to the
--      teacher + every involved student, using the same fan-out
--      logic as grantLiveClassXp in TS.
--   3. After the inserts land, the AFTER INSERT trigger on
--      xp_events installed by migration 060 re-evaluates badges
--      via award_eligible_badges(). Nothing else to do — level and
--      badges catch up automatically.
--
-- Idempotent: every INSERT is guarded with NOT EXISTS, so re-running
-- is a no-op.
--
-- Teacher XP is gated on profiles.xp_enabled (false = skip the
-- teacher's portion; students still collect on the same row).

begin;

-- ─── 1. Lesson completions → xp_events ─────────────────────────
-- Covers both student and teacher rows; the award function itself
-- is role-agnostic, so we award anyone who has completions on
-- record. For teachers, we gate on xp_enabled so a teacher who
-- explicitly turned it off doesn't get back-paid for lessons they
-- previewed while off.
insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
select
  lp.student_id,
  lp.classroom_id,
  25,
  'lesson',
  lp.lesson_slug
from public.lesson_progress lp
join public.profiles p on p.id = lp.student_id
where lp.completed_at is not null
  and (
    p.role = 'student'
    or (p.role = 'teacher' and coalesce(p.xp_enabled, true) = true)
  )
  and not exists (
    select 1 from public.xp_events xe
    where xe.student_id = lp.student_id
      and xe.source = 'lesson'
      and xe.source_id = lp.lesson_slug
  );

-- ─── 2. Live class XP (student_history.status='Done') ──────────
-- Wrapped in a DO so we can branch on whether xp_reward exists
-- yet. When migration 064 has been applied we read the per-class
-- override; before that, every class falls back to the default 30.
do $$
declare
  has_xp_reward boolean;
  default_xp constant int := 30;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'student_history'
      and column_name  = 'xp_reward'
  ) into has_xp_reward;

  -- 2a. Per-roster rows: one specific student via roster_student_id.
  if has_xp_reward then
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select rs.auth_user_id, sh.classroom_id, coalesce(sh.xp_reward, default_xp), 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    join public.roster_students rs on rs.id = sh.roster_student_id
    where sh.status = 'Done'
      and sh.roster_student_id is not null
      and rs.auth_user_id is not null
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = rs.auth_user_id
      );
  else
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select rs.auth_user_id, sh.classroom_id, default_xp, 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    join public.roster_students rs on rs.id = sh.roster_student_id
    where sh.status = 'Done'
      and sh.roster_student_id is not null
      and rs.auth_user_id is not null
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = rs.auth_user_id
      );
  end if;

  -- 2b. Direct-profile rows: student_id set (auth user).
  if has_xp_reward then
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select sh.student_id, sh.classroom_id, coalesce(sh.xp_reward, default_xp), 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    where sh.status = 'Done'
      and sh.student_id is not null
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = sh.student_id
      );
  else
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select sh.student_id, sh.classroom_id, default_xp, 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    where sh.status = 'Done'
      and sh.student_id is not null
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = sh.student_id
      );
  end if;

  -- 2c. Classroom-wide rows: neither student_id nor
  -- roster_student_id set — fan out to every active roster student
  -- in that classroom.
  if has_xp_reward then
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select rs.auth_user_id, sh.classroom_id, coalesce(sh.xp_reward, default_xp), 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    join public.roster_students rs on rs.classroom_id = sh.classroom_id
    where sh.status = 'Done'
      and sh.roster_student_id is null
      and sh.student_id is null
      and sh.classroom_id is not null
      and rs.auth_user_id is not null
      and rs.deleted_at is null
      and (rs.ended_on is null)
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = rs.auth_user_id
      );
  else
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select rs.auth_user_id, sh.classroom_id, default_xp, 'lesson', 'live:' || sh.id::text
    from public.student_history sh
    join public.roster_students rs on rs.classroom_id = sh.classroom_id
    where sh.status = 'Done'
      and sh.roster_student_id is null
      and sh.student_id is null
      and sh.classroom_id is not null
      and rs.auth_user_id is not null
      and rs.deleted_at is null
      and (rs.ended_on is null)
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = rs.auth_user_id
      );
  end if;

  -- 2d. Teacher portion (gated on profiles.xp_enabled).
  if has_xp_reward then
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select sh.teacher_id, sh.classroom_id, coalesce(sh.xp_reward, default_xp), 'teacher_teach', 'live:' || sh.id::text
    from public.student_history sh
    join public.profiles p on p.id = sh.teacher_id
    where sh.status = 'Done'
      and coalesce(p.xp_enabled, true) = true
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = sh.teacher_id
      );
  else
    insert into public.xp_events (student_id, classroom_id, xp_amount, source, source_id)
    select sh.teacher_id, sh.classroom_id, default_xp, 'teacher_teach', 'live:' || sh.id::text
    from public.student_history sh
    join public.profiles p on p.id = sh.teacher_id
    where sh.status = 'Done'
      and coalesce(p.xp_enabled, true) = true
      and not exists (
        select 1 from public.xp_events xe
        where xe.source_id = 'live:' || sh.id::text and xe.student_id = sh.teacher_id
      );
  end if;
end;
$$;

commit;

-- ─── 3. Final reconciliation pass: badges ─────────────────────
-- The trigger on xp_events already ran award_eligible_badges for
-- every inserted row. This loop is a belt-and-suspenders pass so
-- any profile whose badge state could have drifted (e.g. a teacher
-- whose last inserted xp row predates the full catalog) picks up
-- anything still unclaimed.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.award_eligible_badges(r.id);
  end loop;
end;
$$;
