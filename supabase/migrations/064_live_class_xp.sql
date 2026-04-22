-- Live-class XP — per-class XP reward configurable by the teacher.
--
-- When a student_history row hits status='Done', the recorded
-- xp_reward value (defaulting to 30 when the teacher didn't set
-- one explicitly) is granted to every participant:
--   - the teacher, gated on profiles.xp_enabled (off = no XP for
--     the teacher; the class still runs, students still earn)
--   - the student on a per-roster row (student_id or the profile
--     linked via roster_students.auth_user_id)
--   - every active student in the classroom on a classroom-wide
--     row (roster_student_id IS NULL AND classroom_id IS NOT NULL)
--
-- Grant logic lives in TS (lib/gamification/class-xp.ts) because it
-- has to fan out to potentially many students and needs the same
-- idempotency guarantee we use elsewhere — the xp_events table's
-- (source, source_id) pairing dedupes re-grants when a teacher
-- toggles a class Done → not-Done → Done again.

alter table public.student_history
  add column if not exists xp_reward integer
    check (xp_reward is null or xp_reward between 0 and 5000);

comment on column public.student_history.xp_reward is
  'XP awarded when status=Done. Null = default 30 in class-xp.ts. Applied to teacher + every student involved (teacher gated on profiles.xp_enabled).';
