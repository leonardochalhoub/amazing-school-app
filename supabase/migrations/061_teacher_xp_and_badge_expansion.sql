-- Teacher XP + badge catalog expansion.
--
-- Opens up leveling for teachers (same curve as students), adds the
-- data columns a bigger badge catalog needs, and rewrites
-- award_eligible_badges to cover the new unlock kinds:
--
--   count     → extended with teacher counters (assignments_created,
--               lessons_authored, classes_taught, certificates_issued,
--               students_added, classrooms_created, students_certified)
--   hours     → any aggregate of real time-on-platform (heartbeats +
--               live-class minutes + estimated lesson/song minutes +
--               speaking lab)
--   profile_flag → signature / logo / avatar / bio / location /
--               birthday / fossy_attested_at set
--   age       → profile.birthday derives a current age in years
--   calendar  → did the user have any activity on a specific
--               seasonal date (New Year's Day, Festa Junina, Dec 25…)
--   founder   → profile.created_at rank ≤ N (collector's-edition
--               stamp for the first users on the platform)
--
-- Function is idempotent; triggers installed by migration 060 keep
-- firing on the same tables. Run this whole file once — safe to
-- re-apply.

-- ─── 0. Weather observations table ─────────────────────────────
-- Every time the clock-weather-card fetches a current temp for a
-- user, we stash one row here. Drives the weather-themed badges
-- (survivor_42, heatwave_35_3d). Dedup via (user_id, observed_at)
-- is not necessary — the badge logic uses daily aggregates.
create table if not exists public.weather_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  temp_c numeric(4,1) not null check (temp_c between -80 and 70),
  weather_code int,
  observed_at timestamptz not null default now()
);
create index if not exists weather_observations_user_day_idx
  on public.weather_observations (user_id, observed_at);
alter table public.weather_observations enable row level security;
drop policy if exists "user inserts own weather" on public.weather_observations;
create policy "user inserts own weather" on public.weather_observations
  for insert with check (auth.uid() = user_id);
-- No SELECT policy — only service-role reads (bypasses RLS).

-- ─── 1. New profile columns ──────────────────────────────────────
alter table public.profiles
  add column if not exists birthday date,
  add column if not exists bio text
    check (bio is null or char_length(bio) between 1 and 600),
  add column if not exists fossy_attested_at timestamptz;

-- ─── 2. Allow teacher-flavoured xp_events.source values ─────────
-- Also relaxes classroom_id — teacher-polish and lesson-authoring
-- XP grants aren't tied to a specific classroom. Student lesson
-- completions still set classroom_id via the existing code path.
alter table public.xp_events alter column classroom_id drop not null;
alter table public.xp_events drop constraint if exists xp_events_source_check;
alter table public.xp_events
  add constraint xp_events_source_check check (source in (
    'lesson', 'ai_chat', 'streak_bonus', 'badge',
    -- Teacher earning sources:
    'teacher_assign',    -- created an assignment (5 XP)
    'teacher_author',    -- authored a lesson (40 XP)
    'teacher_music',     -- added a song to the catalog (20 XP)
    'teacher_schedule',  -- scheduled a live class (10 XP)
    'teacher_teach',     -- marked a live class Done (30 XP)
    'teacher_certify',   -- issued a certificate (50 XP)
    'teacher_polish',    -- signature / logo / avatar / bio / location (5 XP each)
    'mentor_lesson',     -- one of their students completed a lesson (3 XP)
    'mentor_level',      -- one of their students hit a level milestone (25 XP)
    'mentor_certify'     -- one of their students earned a CEFR cert (100 XP)
  ));

-- ─── 3. Real-minutes view ───────────────────────────────────────
-- One row per profile with every measurable time bucket broken out.
-- Heartbeats use an integer division from seconds; live classes come
-- from the generated duration_minutes column on student_history; the
-- lesson / song estimates use a fixed per-completion value that
-- matches the real-world CEFR expectation (a typical A-level lesson
-- is ~15 min including reflection). Speaking lab pulls from the
-- speaking_events audit log.
create or replace view public.user_real_minutes_v as
select
  p.id as user_id,
  coalesce((
    select floor(sum(sh.seconds) / 60.0)::int
    from public.session_heartbeats sh
    where sh.user_id = p.id
  ), 0) as heartbeat_minutes,
  coalesce((
    select sum(sh.duration_minutes)::int
    from public.student_history sh
    where sh.status = 'Done'
      and sh.duration_minutes is not null
      and (sh.student_id = p.id or sh.teacher_id = p.id)
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

comment on view public.user_real_minutes_v is
  'Per-user real time spent on the platform, broken out by source. Used by award_eligible_badges and the badges-discovery pages. Safe to refresh on read — everything is a per-user aggregate.';

-- ─── 4. Founder rank helper ─────────────────────────────────────
-- Returns the chronological index (1 = very first signup) for a
-- given profile. Cheap because it's a windowed function over a few
-- hundred rows at most.
create or replace function public.profile_founder_rank(p_id uuid)
returns int
language sql
stable
as $$
  with ranked as (
    select id, row_number() over (order by created_at) as rank
    from public.profiles
  )
  select rank::int from ranked where id = p_id;
$$;

-- ─── 5. Rewrite award_eligible_badges ───────────────────────────
-- Expanded to cover hours / profile_flag / age / calendar / founder
-- plus the teacher counters. Kept idempotent: ON CONFLICT DO NOTHING.
create or replace function public.award_eligible_badges(p_student_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Student-facing counters
  v_lessons_completed int := 0;
  v_music_completed   int := 0;
  v_conversations     int := 0;
  v_total_xp          int := 0;
  v_current_streak    int := 0;
  -- Hours (in minutes, we compare >= threshold*60)
  v_all_minutes       int := 0;
  v_live_minutes      int := 0;
  v_lesson_minutes    int := 0;
  v_song_minutes      int := 0;
  v_speaking_minutes  int := 0;
  -- Teacher-facing counters
  v_classrooms_created  int := 0;
  v_students_added      int := 0;
  v_assignments_created int := 0;
  v_lessons_authored    int := 0;
  v_classes_taught      int := 0;
  v_certificates_issued int := 0;
  v_students_certified  int := 0;
  v_mentor_grants       int := 0;
  -- Game-of-Classrooms radical-attitude counters
  v_winter_lessons      int := 0; -- lessons completed during BR winter (Jun-Aug)
  v_night_watch_days    int := 0; -- distinct calendar days with heartbeats at 00-04h
  v_chaotic_month_days  int := 0; -- max distinct active days in any single month
  v_c_grade_issued      int := 0; -- certificates issued with grade = 'C'
  v_created_at          timestamptz;
  -- Longest continuous study session in seconds. "Continuous" = no
  -- gap > 5 min between heartbeats. Drives the dragon ladder (egg →
  -- Balerion). 30s resolution is plenty for hour-level badges.
  v_longest_session_s   int := 0;
  -- Sharpe-series counters
  v_max_lessons_in_day  int := 0; -- most lesson completions in one calendar day
  v_profile_polish_ct   int := 0; -- number of polish flags set on this profile
  -- Weather + platform-day counters
  v_max_temp_seen       numeric := 0; -- hottest temp this user has logged
  v_heatwave_streak     int := 0; -- longest run of consecutive days ≥ 35°C
  v_rainy_study_days    int := 0; -- # distinct days user studied while it rained
  v_distinct_active_days int := 0; -- total # distinct daily_activity dates
  -- Profile flags / meta
  v_has_signature  boolean := false;
  v_has_logo       boolean := false;
  v_has_avatar     boolean := false;
  v_has_bio        boolean := false;
  v_has_location   boolean := false;
  v_has_birthday   boolean := false;
  v_has_fossy      boolean := false;
  v_age_years      int := 0;
  v_founder_rank   int := 0;
  -- Calendar activity flags
  v_did_new_year      boolean := false;
  v_did_christmas     boolean := false;
  v_did_festa_junina  boolean := false;
begin
  if p_student_id is null then
    return;
  end if;

  -- ── counts ──────────────────────────────────────────────────
  select
    coalesce(count(*) filter (where lesson_slug not like 'music:%'), 0),
    coalesce(count(*) filter (where lesson_slug like 'music:%'),     0)
  into v_lessons_completed, v_music_completed
  from public.lesson_progress
  where student_id = p_student_id and completed_at is not null;

  select coalesce(count(*), 0) into v_conversations
  from public.xp_events
  where student_id = p_student_id and source = 'ai_chat';

  select coalesce(sum(xp_amount), 0) into v_total_xp
  from public.xp_events where student_id = p_student_id;

  -- Streak (islands-and-gaps) — same trick as migration 060.
  with activity_distinct as (
    select distinct activity_date
    from public.daily_activity
    where student_id = p_student_id
  ),
  runs as (
    select
      activity_date,
      activity_date -
        (row_number() over (order by activity_date))::int as grp
    from activity_distinct
  ),
  island_runs as (
    select count(*) as run_len, max(activity_date) as last_day
    from runs
    group by grp
  )
  select coalesce(max(run_len), 0) into v_current_streak
  from island_runs
  where last_day >= current_date - interval '1 day';

  -- ── real minutes ────────────────────────────────────────────
  select
    coalesce(heartbeat_minutes + live_class_minutes + lesson_minutes + song_minutes + speaking_minutes, 0),
    coalesce(live_class_minutes, 0),
    coalesce(lesson_minutes, 0),
    coalesce(song_minutes, 0),
    coalesce(speaking_minutes, 0)
  into v_all_minutes, v_live_minutes, v_lesson_minutes, v_song_minutes, v_speaking_minutes
  from public.user_real_minutes_v
  where user_id = p_student_id;

  -- ── teacher counters ────────────────────────────────────────
  select coalesce(count(*), 0) into v_classrooms_created
  from public.classrooms where teacher_id = p_student_id;

  select coalesce(count(*), 0) into v_students_added
  from public.roster_students
  where teacher_id = p_student_id
    and (deleted_at is null);

  select coalesce(count(*), 0) into v_assignments_created
  from public.lesson_assignments where assigned_by = p_student_id;

  select coalesce(count(*), 0) into v_lessons_authored
  from public.teacher_lessons
  where teacher_id = p_student_id and published = true;

  select coalesce(count(*), 0) into v_classes_taught
  from public.student_history
  where teacher_id = p_student_id and status = 'Done';

  select coalesce(count(*), 0) into v_certificates_issued
  from public.certificates where teacher_id = p_student_id;

  select coalesce(count(distinct roster_student_id), 0) into v_students_certified
  from public.certificates where teacher_id = p_student_id;

  -- Mentor XP grant count — total `mentor_*` xp_events attributed to
  -- this teacher. Drives the Hand-of-the-King GoT badge.
  select coalesce(count(*), 0) into v_mentor_grants
  from public.xp_events
  where student_id = p_student_id and source like 'mentor_%';

  -- ── Game-of-Classrooms counters ─────────────────────────────
  -- Winterfell Watch: lessons completed in BR winter (Jun-Aug). The
  -- radical attitude is staying in the grind during the off-season.
  select coalesce(count(*), 0) into v_winter_lessons
  from public.lesson_progress
  where student_id = p_student_id
    and completed_at is not null
    and extract(month from completed_at) in (6, 7, 8);

  -- Night's Watch: distinct calendar days with recorded focused time
  -- between 00:00 and 04:59 local (tz-naive — good enough for vibes).
  select coalesce(count(distinct at::date), 0) into v_night_watch_days
  from public.session_heartbeats
  where user_id = p_student_id
    and extract(hour from at) between 0 and 4;

  -- Chaos is a Ladder: max distinct active days in any single month.
  -- Yields the worst-case "near-daily for a month" signal.
  select coalesce(max(days), 0) into v_chaotic_month_days
  from (
    select count(distinct activity_date) as days
    from public.daily_activity
    where student_id = p_student_id
    group by date_trunc('month', activity_date)
  ) m;

  -- Red Wedding: certificates issued with the brutal C grade.
  select coalesce(count(*), 0) into v_c_grade_issued
  from public.certificates
  where teacher_id = p_student_id and grade = 'C';

  -- Profile created_at for Dracarys (rapid-rise badge).
  select created_at into v_created_at
  from public.profiles where id = p_student_id;

  -- Dragon ladder: longest continuous session (focused seconds in a
  -- stretch with no gap > 5 minutes between heartbeats). Islands-
  -- and-gaps over timestamps.
  with ordered as (
    select at, seconds,
      extract(epoch from at - lag(at) over (order by at)) as gap_s
    from public.session_heartbeats
    where user_id = p_student_id
  ),
  grouped as (
    select seconds,
      sum(case when gap_s > 300 or gap_s is null then 1 else 0 end)
        over (order by at) as island
    from ordered
  ),
  per_island as (
    select sum(seconds) as total_seconds
    from grouped
    group by island
  )
  select coalesce(max(total_seconds), 0)::int into v_longest_session_s
  from per_island;

  -- Harper's Volley Gun — most lesson completions in a single day.
  select coalesce(max(cnt), 0)::int into v_max_lessons_in_day
  from (
    select count(*) as cnt
    from public.lesson_progress
    where student_id = p_student_id
      and completed_at is not null
    group by completed_at::date
  ) d;

  -- Sharpe's Honour — number of profile polish flags already true.
  v_profile_polish_ct :=
      (case when v_has_avatar    then 1 else 0 end)
    + (case when v_has_bio       then 1 else 0 end)
    + (case when v_has_location  then 1 else 0 end)
    + (case when v_has_birthday  then 1 else 0 end)
    + (case when v_has_signature then 1 else 0 end)
    + (case when v_has_logo      then 1 else 0 end);

  -- ── weather counters ────────────────────────────────────────
  select coalesce(max(temp_c), 0) into v_max_temp_seen
  from public.weather_observations where user_id = p_student_id;

  -- Heatwave streak: longest run of consecutive days where the
  -- user's daily max observed temperature was ≥ 35°C. Islands-and-
  -- gaps over distinct daily-hot dates.
  with daily_hot as (
    select observed_at::date as d, max(temp_c) as day_max
    from public.weather_observations
    where user_id = p_student_id
    group by observed_at::date
    having max(temp_c) >= 35
  ),
  runs as (
    select d, d - (row_number() over (order by d))::int as grp
    from daily_hot
  ),
  island_runs as (
    select count(*) as run_len from runs group by grp
  )
  select coalesce(max(run_len), 0) into v_heatwave_streak
  from island_runs;

  -- Rainy study day = user had daily_activity AND logged any weather
  -- row that day whose WMO weather_code is in the rainy bands
  -- (drizzle 51-57, rain 61-67, showers 80-82, thunderstorms 95-99).
  select count(distinct da.activity_date) into v_rainy_study_days
  from public.daily_activity da
  where da.student_id = p_student_id
    and exists (
      select 1 from public.weather_observations wo
      where wo.user_id = p_student_id
        and wo.observed_at::date = da.activity_date
        and (
          wo.weather_code between 51 and 57
          or wo.weather_code between 61 and 67
          or wo.weather_code between 80 and 82
          or wo.weather_code in (95, 96, 99)
        )
    );

  -- Total distinct active days on the platform. Drives the beast-of-
  -- revelation ladder: 333 → half-beast, 666 → the beast.
  select coalesce(count(distinct activity_date), 0) into v_distinct_active_days
  from public.daily_activity where student_id = p_student_id;

  -- ── profile flags ───────────────────────────────────────────
  select
    coalesce(signature_url is not null and signature_enabled is true, false),
    coalesce(school_logo_url is not null, false),
    coalesce(avatar_url is not null, false),
    coalesce(bio is not null, false),
    coalesce(location is not null, false),
    coalesce(birthday is not null, false),
    coalesce(fossy_attested_at is not null, false),
    coalesce(extract(year from age(current_date, birthday))::int, 0)
  into
    v_has_signature, v_has_logo, v_has_avatar, v_has_bio,
    v_has_location, v_has_birthday, v_has_fossy, v_age_years
  from public.profiles
  where id = p_student_id;

  v_founder_rank := coalesce(public.profile_founder_rank(p_student_id), 99999);

  -- ── calendar activity ───────────────────────────────────────
  -- A calendar badge fires the FIRST time a user has any logged
  -- activity (daily_activity row OR heartbeat) on one of these
  -- named dates in any year.
  select exists (
    select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 1
      and extract(day from activity_date) = 1
  ) into v_did_new_year;

  select exists (
    select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 12
      and extract(day from activity_date) = 25
  ) into v_did_christmas;

  select exists (
    select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 6
      and extract(day from activity_date) between 20 and 30
  ) into v_did_festa_junina;

  -- ── insert eligible badges ──────────────────────────────────
  -- Order of UNION branches matters only for RETURNING legibility.
  -- ON CONFLICT ensures anything already held is silently skipped.
  return query
  with inserted as (
    insert into public.badges (student_id, badge_type)
    select p_student_id, t.badge_type
    from (
                -- ─── Milestones (count) ─────────────────────
                select 'welcome_aboard'::text as badge_type
      union all select 'first_lesson'   where v_lessons_completed >= 1
      union all select 'five_lessons'   where v_lessons_completed >= 5
      union all select 'ten_lessons'    where v_lessons_completed >= 10
      union all select 'bookworm'       where v_lessons_completed >= 25
      union all select 'fifty_lessons'  where v_lessons_completed >= 50
      union all select 'hundred_lessons'  where v_lessons_completed >= 100
      union all select 'two_fifty_lessons' where v_lessons_completed >= 250
      union all select 'five_hundred_lessons' where v_lessons_completed >= 500
      union all select 'one_thousand_lessons' where v_lessons_completed >= 1000
      union all select 'first_chat'     where v_conversations     >= 1
      union all select 'ten_chats'      where v_conversations     >= 10
      union all select 'hundred_chats'  where v_conversations     >= 100
      union all select 'first_song'     where v_music_completed   >= 1
      union all select 'five_songs'     where v_music_completed   >= 5
      union all select 'music_lover'    where v_music_completed   >= 5
      union all select 'twenty_songs'   where v_music_completed   >= 20
      union all select 'fifty_songs'    where v_music_completed   >= 50
      union all select 'hundred_songs'  where v_music_completed   >= 100
                -- ─── Streaks ───────────────────────────────
      union all select 'streak_3'       where v_current_streak    >= 3
      union all select 'streak_7'       where v_current_streak    >= 7
      union all select 'streak_14'      where v_current_streak    >= 14
      union all select 'streak_30'      where v_current_streak    >= 30
      union all select 'streak_60'      where v_current_streak    >= 60
      union all select 'streak_90'      where v_current_streak    >= 90
      union all select 'streak_180'     where v_current_streak    >= 180
      union all select 'streak_365'     where v_current_streak    >= 365
                -- ─── Levels (derived from total_xp) ────────
      union all select 'level_2'        where v_total_xp          >= 100
      union all select 'level_3'        where v_total_xp          >= 400
      union all select 'level_5'        where v_total_xp          >= 2000
      union all select 'level_10'       where v_total_xp          >= 16500
      union all select 'level_15'       where v_total_xp          >= 56000
      union all select 'level_25'       where v_total_xp          >= 260000
      union all select 'level_50'       where v_total_xp          >= 2082500
                -- ─── Real hours (all sources) ─────────────
      union all select 'hours_1'        where v_all_minutes       >= 60
      union all select 'hours_5'        where v_all_minutes       >= 300
      union all select 'hours_10'       where v_all_minutes       >= 600
      union all select 'hours_25'       where v_all_minutes       >= 1500
      union all select 'hours_40'       where v_all_minutes       >= 2400  -- CEFR semester
      union all select 'hours_80'       where v_all_minutes       >= 4800  -- CEFR year
      union all select 'hours_120'      where v_all_minutes       >= 7200
      union all select 'hours_240'      where v_all_minutes       >= 14400 -- 2 CEFR years
      union all select 'hours_480'      where v_all_minutes       >= 28800 -- 4 CEFR semesters
                -- ─── Real hours (specialised) ─────────────
      union all select 'speaking_hour'  where v_speaking_minutes  >= 60
      union all select 'speaking_10h'   where v_speaking_minutes  >= 600
      union all select 'listening_5h'   where v_song_minutes      >= 300
                -- ─── Profile polish ───────────────────────
      union all select 'profile_avatar'    where v_has_avatar
      union all select 'profile_bio'       where v_has_bio
      union all select 'profile_location'  where v_has_location
      union all select 'profile_birthday'  where v_has_birthday
      union all select 'teacher_signature' where v_has_signature
      union all select 'teacher_logo'      where v_has_logo
                -- ─── Teacher milestones ───────────────────
      union all select 'teacher_first_classroom' where v_classrooms_created >= 1
      union all select 'teacher_three_classrooms' where v_classrooms_created >= 3
      union all select 'teacher_first_student'   where v_students_added >= 1
      union all select 'teacher_ten_students'    where v_students_added >= 10
      union all select 'teacher_fifty_students'  where v_students_added >= 50
      union all select 'teacher_hundred_students' where v_students_added >= 100
      union all select 'teacher_first_task'      where v_assignments_created >= 1
      union all select 'teacher_ten_tasks'       where v_assignments_created >= 10
      union all select 'teacher_fifty_tasks'     where v_assignments_created >= 50
      union all select 'teacher_hundred_tasks'   where v_assignments_created >= 100
      union all select 'teacher_five_hundred_tasks' where v_assignments_created >= 500
      union all select 'teacher_first_authored'  where v_lessons_authored >= 1
      union all select 'teacher_five_authored'   where v_lessons_authored >= 5
      union all select 'teacher_twenty_five_authored' where v_lessons_authored >= 25
      union all select 'teacher_first_class'     where v_classes_taught >= 1
      union all select 'teacher_ten_classes'     where v_classes_taught >= 10
      union all select 'teacher_fifty_classes'   where v_classes_taught >= 50
      union all select 'teacher_hundred_classes' where v_classes_taught >= 100
      union all select 'teacher_first_cert'      where v_certificates_issued >= 1
      union all select 'teacher_ten_certs'       where v_certificates_issued >= 10
      union all select 'teacher_fifty_certs'     where v_certificates_issued >= 50
                -- ─── Easter eggs ──────────────────────────
      union all select 'answer_to_everything' where v_age_years >= 42 and v_age_years < 43
      union all select 'y2k_login'       where v_did_new_year
      union all select 'yule_log'        where v_did_christmas
      union all select 'festa_junina'    where v_did_festa_junina
      union all select 'founding_100'    where v_founder_rank <= 100
      union all select 'founding_500'    where v_founder_rank <= 500
      union all select 'open_source_patron' where v_has_fossy
                -- ─── Very hard: God/Goddess of Open-Source & Free Education
                --      Teacher with ≥ 100 taught classes AND ≥ 10 certs issued
      union all select 'god_of_free_education'
                  where v_classes_taught >= 100 and v_certificates_issued >= 10
                -- ─── Freire — teacher who has certified 25 distinct students
      union all select 'freire'
                  where v_students_certified >= 25
                -- ─── Game of Classrooms — GoT-themed radical feats ──
      union all select 'the_wall'
                  where v_current_streak >= 100
      union all select 'winterfell_watch'
                  where v_winter_lessons >= 50
      union all select 'mother_of_dragons'
                  where v_classrooms_created >= 3
                    and v_students_added >= 25
      union all select 'hand_of_the_realm'
                  where v_mentor_grants >= 100
      union all select 'khaleesi_of_the_great_grass_sea'
                  where v_all_minutes >= 14400  -- 240h
      union all select 'valar_morghulis'
                  where v_lessons_completed >= 1000
      union all select 'valar_dohaeris'
                  where v_certificates_issued >= 100
      union all select 'iron_throne'
                  where v_classes_taught >= 100
                    and v_certificates_issued >= 50
                    and v_students_added >= 100
      union all select 'you_know_nothing'
                  where v_lessons_completed >= 100
                    and v_conversations = 0
      union all select 'red_wedding'
                  where v_c_grade_issued >= 1
      union all select 'chaos_is_a_ladder'
                  where v_chaotic_month_days >= 25
      union all select 'dracarys'
                  where v_total_xp >= 260000
                    and v_created_at > (now() - interval '90 days')
                -- ─── Dragons (continuous-session ladder) ─────────────
      union all select 'dragon_egg'
                  where v_longest_session_s >= 3600       -- 1h
      union all select 'dragon_wyvern'
                  where v_longest_session_s >= 10800      -- 3h
      union all select 'dragon_drogon'
                  where v_longest_session_s >= 21600      -- 6h
      union all select 'dragon_vhagar'
                  where v_longest_session_s >= 32400      -- 9h · 2nd biggest
      union all select 'dragon_balerion'
                  where v_longest_session_s >= 43200      -- 12h · the Black Dread
                -- ─── Sharpe & Harper — Napoleonic-Wars pack ────────────
      union all select 'sharpe_tiger'       where v_total_xp >= 400         -- level 3 (rose from the ranks)
      union all select 'sharpe_triumph'     where v_total_xp >= 2000        -- level 5
      union all select 'sharpe_rifles'      where v_lessons_completed >= 25
      union all select 'sharpe_gold'        where v_total_xp >= 10000
      union all select 'sharpe_sword'       where v_lessons_completed >= 100
      union all select 'sharpe_prey'        where v_conversations >= 10
      union all select 'sharpe_escape'      where v_longest_session_s >= 7200  -- 2h
      union all select 'sharpe_eagle'       where v_certificates_issued >= 1
      union all select 'sharpe_company'
                  where v_students_added >= 10 and v_assignments_created >= 10
      union all select 'sharpe_fortress'    where v_classrooms_created >= 5
      union all select 'sharpe_regiment'
                  where v_students_added >= 50 and v_classrooms_created >= 3
      union all select 'sharpe_siege'
                  where v_current_streak >= 30 and v_lessons_completed >= 50
      union all select 'sharpe_revenge'     where v_current_streak >= 60
      union all select 'sharpe_honour'      where v_profile_polish_ct >= 5
      union all select 'sharpe_battle'      where v_lessons_completed >= 500
      union all select 'sharpe_waterloo'
                  where v_lessons_completed >= 1000 and v_total_xp >= 260000
      union all select 'harpers_volley_gun' where v_max_lessons_in_day >= 7
      union all select 'chosen_men'         where v_certificates_issued >= 10
      union all select 'wellingtons_orders'
                  where v_lessons_completed >= 100 and v_current_streak >= 30
                -- ─── Weather + platform-days ──────────────────────────
      union all select 'survivor_42'        where v_max_temp_seen > 42
      union all select 'heatwave_35_3d'     where v_heatwave_streak >= 3
      union all select 'rain_scholar'       where v_rainy_study_days >= 20
      union all select 'meio_besta'         where v_distinct_active_days >= 333
      union all select 'a_besta'            where v_distinct_active_days >= 666
    ) t
    on conflict (student_id, badge_type) do nothing
    returning badge_type
  )
  select badge_type from inserted;
end;
$$;

-- ─── 6. One-shot re-run for every profile ──────────────────────
-- Same idempotent backfill pattern as migration 060. Safely picks up
-- everyone who should retroactively earn the new badges.
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.award_eligible_badges(r.id);
  end loop;
end;
$$;
