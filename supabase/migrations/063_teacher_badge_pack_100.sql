-- Teacher-only badge pack (100 new badges).
--
-- Ladder-style achievements across every measurable teacher action:
-- classes taught, live-class hours delivered, assignments created
-- (with "Master of Puppets" at 5000), teacher tenure in days,
-- lessons authored, students added, students certified, certificates
-- issued, classrooms created (total), simultaneous-active classrooms,
-- concurrent-active students (incl. "She's a Mother" at 30), and
-- mentor-XP grants.
--
-- Re-CREATE OR REPLACEs award_eligible_badges with the full body
-- (all prior 060/061 branches preserved) plus the new 100 branches
-- and the three new counters they need (active classrooms, active
-- students, tenure days). The triggers installed in migration 060
-- keep firing against this new function body automatically.

create or replace function public.award_eligible_badges(p_student_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Student-facing counters (from 061)
  v_lessons_completed int := 0;
  v_music_completed   int := 0;
  v_conversations     int := 0;
  v_total_xp          int := 0;
  v_current_streak    int := 0;
  v_all_minutes       int := 0;
  v_live_minutes      int := 0;
  v_lesson_minutes    int := 0;
  v_song_minutes      int := 0;
  v_speaking_minutes  int := 0;
  v_classrooms_created  int := 0;
  v_students_added      int := 0;
  v_assignments_created int := 0;
  v_lessons_authored    int := 0;
  v_classes_taught      int := 0;
  v_certificates_issued int := 0;
  v_students_certified  int := 0;
  v_mentor_grants       int := 0;
  v_winter_lessons      int := 0;
  v_night_watch_days    int := 0;
  v_chaotic_month_days  int := 0;
  v_c_grade_issued      int := 0;
  v_created_at          timestamptz;
  v_longest_session_s   int := 0;
  v_max_lessons_in_day  int := 0;
  v_profile_polish_ct   int := 0;
  v_max_temp_seen       numeric := 0;
  v_heatwave_streak     int := 0;
  v_rainy_study_days    int := 0;
  v_distinct_active_days int := 0;
  v_has_signature  boolean := false;
  v_has_logo       boolean := false;
  v_has_avatar     boolean := false;
  v_has_bio        boolean := false;
  v_has_location   boolean := false;
  v_has_birthday   boolean := false;
  v_has_fossy      boolean := false;
  v_age_years      int := 0;
  v_founder_rank   int := 0;
  v_did_new_year      boolean := false;
  v_did_christmas     boolean := false;
  v_did_festa_junina  boolean := false;
  -- NEW for the 100 teacher-pack
  v_tenure_days        int := 0;
  v_active_classrooms  int := 0;
  v_active_students    int := 0;
  v_hours_taught       int := 0; -- live_minutes / 60
begin
  if p_student_id is null then return; end if;

  -- ───── counts ─────
  select
    coalesce(count(*) filter (where lesson_slug not like 'music:%'), 0),
    coalesce(count(*) filter (where lesson_slug like 'music:%'),     0)
  into v_lessons_completed, v_music_completed
  from public.lesson_progress
  where student_id = p_student_id and completed_at is not null;

  select coalesce(count(*), 0) into v_conversations
  from public.xp_events where student_id = p_student_id and source = 'ai_chat';

  select coalesce(sum(xp_amount), 0) into v_total_xp
  from public.xp_events where student_id = p_student_id;

  with ad as (
    select distinct activity_date from public.daily_activity where student_id = p_student_id
  ),
  runs as (
    select activity_date, activity_date - (row_number() over (order by activity_date))::int as grp from ad
  ),
  ir as (select count(*) as run_len, max(activity_date) as last_day from runs group by grp)
  select coalesce(max(run_len), 0) into v_current_streak from ir
  where last_day >= current_date - interval '1 day';

  -- ───── real minutes ─────
  select
    coalesce(heartbeat_minutes + live_class_minutes + lesson_minutes + song_minutes + speaking_minutes, 0),
    coalesce(live_class_minutes, 0),
    coalesce(lesson_minutes, 0),
    coalesce(song_minutes, 0),
    coalesce(speaking_minutes, 0)
  into v_all_minutes, v_live_minutes, v_lesson_minutes, v_song_minutes, v_speaking_minutes
  from public.user_real_minutes_v where user_id = p_student_id;
  v_hours_taught := floor(v_live_minutes / 60.0)::int;

  -- ───── teacher counters ─────
  select coalesce(count(*), 0) into v_classrooms_created
  from public.classrooms where teacher_id = p_student_id;

  select coalesce(count(*), 0) into v_students_added
  from public.roster_students where teacher_id = p_student_id and (deleted_at is null);

  select coalesce(count(*), 0) into v_assignments_created
  from public.lesson_assignments where assigned_by = p_student_id;

  select coalesce(count(*), 0) into v_lessons_authored
  from public.teacher_lessons where teacher_id = p_student_id and published = true;

  select coalesce(count(*), 0) into v_classes_taught
  from public.student_history where teacher_id = p_student_id and status = 'Done';

  select coalesce(count(*), 0) into v_certificates_issued
  from public.certificates where teacher_id = p_student_id;

  select coalesce(count(distinct roster_student_id), 0) into v_students_certified
  from public.certificates where teacher_id = p_student_id;

  select coalesce(count(*), 0) into v_mentor_grants
  from public.xp_events where student_id = p_student_id and source like 'mentor_%';

  -- ── Game-of-Classrooms / Sharpe / weather counters (from 061) ──
  select coalesce(count(*), 0) into v_winter_lessons
  from public.lesson_progress
  where student_id = p_student_id and completed_at is not null
    and extract(month from completed_at) in (6, 7, 8);

  select coalesce(count(distinct at::date), 0) into v_night_watch_days
  from public.session_heartbeats
  where user_id = p_student_id and extract(hour from at) between 0 and 4;

  select coalesce(max(days), 0) into v_chaotic_month_days
  from (
    select count(distinct activity_date) as days
    from public.daily_activity where student_id = p_student_id
    group by date_trunc('month', activity_date)
  ) m;

  select coalesce(count(*), 0) into v_c_grade_issued
  from public.certificates where teacher_id = p_student_id and grade = 'C';

  select created_at into v_created_at from public.profiles where id = p_student_id;
  v_tenure_days := greatest(0, (current_date - v_created_at::date)::int);

  with ordered as (
    select at, seconds, extract(epoch from at - lag(at) over (order by at)) as gap_s
    from public.session_heartbeats where user_id = p_student_id
  ),
  grouped as (
    select seconds,
      sum(case when gap_s > 300 or gap_s is null then 1 else 0 end) over (order by at) as island
    from ordered
  ),
  per_island as (select sum(seconds) as total_seconds from grouped group by island)
  select coalesce(max(total_seconds), 0)::int into v_longest_session_s from per_island;

  select coalesce(max(cnt), 0)::int into v_max_lessons_in_day
  from (
    select count(*) as cnt from public.lesson_progress
    where student_id = p_student_id and completed_at is not null
    group by completed_at::date
  ) d;

  -- ── profile flags ──
  select
    coalesce(signature_url is not null and signature_enabled is true, false),
    coalesce(school_logo_url is not null, false),
    coalesce(avatar_url is not null, false),
    coalesce(bio is not null, false),
    coalesce(location is not null, false),
    coalesce(birthday is not null, false),
    coalesce(fossy_attested_at is not null, false),
    coalesce(extract(year from age(current_date, birthday))::int, 0)
  into v_has_signature, v_has_logo, v_has_avatar, v_has_bio,
       v_has_location, v_has_birthday, v_has_fossy, v_age_years
  from public.profiles where id = p_student_id;

  v_founder_rank := coalesce(public.profile_founder_rank(p_student_id), 99999);

  v_profile_polish_ct :=
      (case when v_has_avatar    then 1 else 0 end)
    + (case when v_has_bio       then 1 else 0 end)
    + (case when v_has_location  then 1 else 0 end)
    + (case when v_has_birthday  then 1 else 0 end)
    + (case when v_has_signature then 1 else 0 end)
    + (case when v_has_logo      then 1 else 0 end);

  -- ── weather + platform days ──
  select coalesce(max(temp_c), 0) into v_max_temp_seen
  from public.weather_observations where user_id = p_student_id;

  with daily_hot as (
    select observed_at::date as d, max(temp_c) as day_max
    from public.weather_observations where user_id = p_student_id
    group by observed_at::date having max(temp_c) >= 35
  ),
  runs as (select d, d - (row_number() over (order by d))::int as grp from daily_hot),
  ir as (select count(*) as run_len from runs group by grp)
  select coalesce(max(run_len), 0) into v_heatwave_streak from ir;

  select count(distinct da.activity_date) into v_rainy_study_days
  from public.daily_activity da
  where da.student_id = p_student_id
    and exists (
      select 1 from public.weather_observations wo
      where wo.user_id = p_student_id
        and wo.observed_at::date = da.activity_date
        and (wo.weather_code between 51 and 57 or wo.weather_code between 61 and 67
             or wo.weather_code between 80 and 82 or wo.weather_code in (95,96,99))
    );

  select coalesce(count(distinct activity_date), 0) into v_distinct_active_days
  from public.daily_activity where student_id = p_student_id;

  -- ── Active (concurrent) classrooms + students ──
  -- No soft-delete on classrooms — every row the teacher created
  -- counts as "active" for this snapshot. Students use the same
  -- deleted_at gate as the roster ladder.
  select coalesce(count(*), 0) into v_active_classrooms
  from public.classrooms where teacher_id = p_student_id;

  select coalesce(count(*), 0) into v_active_students
  from public.roster_students
  where teacher_id = p_student_id and deleted_at is null and ended_on is null;

  -- ── calendar flags ──
  select exists (select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 1 and extract(day from activity_date) = 1)
  into v_did_new_year;

  select exists (select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 12 and extract(day from activity_date) = 25)
  into v_did_christmas;

  select exists (select 1 from public.daily_activity
    where student_id = p_student_id
      and extract(month from activity_date) = 6 and extract(day from activity_date) between 20 and 30)
  into v_did_festa_junina;

  -- ═══════════════════════════════════════════════════════════════
  -- INSERT: every eligible badge, union-all'd.
  -- ═══════════════════════════════════════════════════════════════
  return query
  with inserted as (
    insert into public.badges (student_id, badge_type)
    select p_student_id, t.badge_type
    from (
      -- ─── Pre-existing 061 core ─────────────────────────────────
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
      union all select 'streak_3'       where v_current_streak    >= 3
      union all select 'streak_7'       where v_current_streak    >= 7
      union all select 'streak_14'      where v_current_streak    >= 14
      union all select 'streak_30'      where v_current_streak    >= 30
      union all select 'streak_60'      where v_current_streak    >= 60
      union all select 'streak_90'      where v_current_streak    >= 90
      union all select 'streak_180'     where v_current_streak    >= 180
      union all select 'streak_365'     where v_current_streak    >= 365
      union all select 'level_2'        where v_total_xp >= 100
      union all select 'level_3'        where v_total_xp >= 400
      union all select 'level_5'        where v_total_xp >= 2000
      union all select 'level_10'       where v_total_xp >= 16500
      union all select 'level_15'       where v_total_xp >= 56000
      union all select 'level_25'       where v_total_xp >= 260000
      union all select 'level_50'       where v_total_xp >= 2082500
      union all select 'hours_1'        where v_all_minutes >= 60
      union all select 'hours_5'        where v_all_minutes >= 300
      union all select 'hours_10'       where v_all_minutes >= 600
      union all select 'hours_25'       where v_all_minutes >= 1500
      union all select 'hours_40'       where v_all_minutes >= 2400
      union all select 'hours_80'       where v_all_minutes >= 4800
      union all select 'hours_120'      where v_all_minutes >= 7200
      union all select 'hours_240'      where v_all_minutes >= 14400
      union all select 'hours_480'      where v_all_minutes >= 28800
      union all select 'speaking_hour'  where v_speaking_minutes >= 60
      union all select 'speaking_10h'   where v_speaking_minutes >= 600
      union all select 'listening_5h'   where v_song_minutes >= 300
      union all select 'profile_avatar'    where v_has_avatar
      union all select 'profile_bio'       where v_has_bio
      union all select 'profile_location'  where v_has_location
      union all select 'profile_birthday'  where v_has_birthday
      union all select 'teacher_signature' where v_has_signature
      union all select 'teacher_logo'      where v_has_logo
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
      union all select 'answer_to_everything' where v_age_years >= 42 and v_age_years < 43
      union all select 'y2k_login'       where v_did_new_year
      union all select 'yule_log'        where v_did_christmas
      union all select 'festa_junina'    where v_did_festa_junina
      union all select 'founding_100'    where v_founder_rank <= 100
      union all select 'founding_500'    where v_founder_rank <= 500
      union all select 'open_source_patron' where v_has_fossy
      union all select 'god_of_free_education'
                  where v_classes_taught >= 100 and v_certificates_issued >= 10
      union all select 'freire'  where v_students_certified >= 25
      -- ─── Game of Classrooms + Dragons ──
      union all select 'the_wall'                     where v_current_streak >= 100
      union all select 'winterfell_watch'             where v_winter_lessons >= 50
      union all select 'mother_of_dragons'            where v_classrooms_created >= 3 and v_students_added >= 25
      union all select 'hand_of_the_realm'            where v_mentor_grants >= 100
      union all select 'khaleesi_of_the_great_grass_sea' where v_all_minutes >= 14400
      union all select 'valar_morghulis'              where v_lessons_completed >= 1000
      union all select 'valar_dohaeris'               where v_certificates_issued >= 100
      union all select 'iron_throne'                  where v_classes_taught >= 100 and v_certificates_issued >= 50 and v_students_added >= 100
      union all select 'you_know_nothing'             where v_lessons_completed >= 100 and v_conversations = 0
      union all select 'red_wedding'                  where v_c_grade_issued >= 1
      union all select 'chaos_is_a_ladder'            where v_chaotic_month_days >= 25
      union all select 'dracarys'                     where v_total_xp >= 260000 and v_created_at > (now() - interval '90 days')
      union all select 'dragon_egg'      where v_longest_session_s >= 3600
      union all select 'dragon_wyvern'   where v_longest_session_s >= 10800
      union all select 'dragon_drogon'   where v_longest_session_s >= 21600
      union all select 'dragon_vhagar'   where v_longest_session_s >= 32400
      union all select 'dragon_balerion' where v_longest_session_s >= 43200
      -- ─── Sharpe & Harper ──
      union all select 'sharpe_tiger'       where v_total_xp >= 400
      union all select 'sharpe_triumph'     where v_total_xp >= 2000
      union all select 'sharpe_rifles'      where v_lessons_completed >= 25
      union all select 'sharpe_gold'        where v_total_xp >= 10000
      union all select 'sharpe_sword'       where v_lessons_completed >= 100
      union all select 'sharpe_prey'        where v_conversations >= 10
      union all select 'sharpe_escape'      where v_longest_session_s >= 7200
      union all select 'sharpe_eagle'       where v_certificates_issued >= 1
      union all select 'sharpe_company'     where v_students_added >= 10 and v_assignments_created >= 10
      union all select 'sharpe_fortress'    where v_classrooms_created >= 5
      union all select 'sharpe_regiment'    where v_students_added >= 50 and v_classrooms_created >= 3
      union all select 'sharpe_siege'       where v_current_streak >= 30 and v_lessons_completed >= 50
      union all select 'sharpe_revenge'     where v_current_streak >= 60
      union all select 'sharpe_honour'      where v_profile_polish_ct >= 5
      union all select 'sharpe_battle'      where v_lessons_completed >= 500
      union all select 'sharpe_waterloo'    where v_lessons_completed >= 1000 and v_total_xp >= 260000
      union all select 'harpers_volley_gun' where v_max_lessons_in_day >= 7
      union all select 'chosen_men'         where v_certificates_issued >= 10
      union all select 'wellingtons_orders' where v_lessons_completed >= 100 and v_current_streak >= 30
      -- ─── Weather / platform-days ──
      union all select 'survivor_42'        where v_max_temp_seen > 42
      union all select 'heatwave_35_3d'     where v_heatwave_streak >= 3
      union all select 'rain_scholar'       where v_rainy_study_days >= 20
      union all select 'meio_besta'         where v_distinct_active_days >= 333
      union all select 'a_besta'            where v_distinct_active_days >= 666
      union all select 'root_of_all_evil'   where v_all_minutes >= 11520
      -- ═══════════════════════════════════════════════════════════
      -- ═══ NEW 100 — teacher-only ladder pack ══════════════════
      -- Classes Taught (13)
      union all select 'classes_3'    where v_classes_taught >= 3
      union all select 'classes_5'    where v_classes_taught >= 5
      union all select 'classes_15'   where v_classes_taught >= 15
      union all select 'classes_25'   where v_classes_taught >= 25
      union all select 'classes_75'   where v_classes_taught >= 75
      union all select 'classes_150'  where v_classes_taught >= 150
      union all select 'classes_200'  where v_classes_taught >= 200
      union all select 'classes_300'  where v_classes_taught >= 300
      union all select 'classes_500'  where v_classes_taught >= 500
      union all select 'classes_750'  where v_classes_taught >= 750
      union all select 'classes_1000' where v_classes_taught >= 1000
      union all select 'classes_1500' where v_classes_taught >= 1500
      union all select 'classes_5000' where v_classes_taught >= 5000
      -- Hours Taught / live-class minutes delivered (12)
      union all select 'hours_taught_1'    where v_hours_taught >= 1
      union all select 'hours_taught_5'    where v_hours_taught >= 5
      union all select 'hours_taught_10'   where v_hours_taught >= 10
      union all select 'hours_taught_25'   where v_hours_taught >= 25
      union all select 'hours_taught_40'   where v_hours_taught >= 40
      union all select 'hours_taught_80'   where v_hours_taught >= 80
      union all select 'hours_taught_120'  where v_hours_taught >= 120
      union all select 'hours_taught_200'  where v_hours_taught >= 200
      union all select 'hours_taught_300'  where v_hours_taught >= 300
      union all select 'hours_taught_500'  where v_hours_taught >= 500
      union all select 'hours_taught_750'  where v_hours_taught >= 750
      union all select 'hours_taught_1000' where v_hours_taught >= 1000
      -- Assignments Created (12, Master of Puppets at 5000)
      union all select 'assigns_3'     where v_assignments_created >= 3
      union all select 'assigns_5'     where v_assignments_created >= 5
      union all select 'assigns_25'    where v_assignments_created >= 25
      union all select 'assigns_75'    where v_assignments_created >= 75
      union all select 'assigns_200'   where v_assignments_created >= 200
      union all select 'assigns_300'   where v_assignments_created >= 300
      union all select 'assigns_750'   where v_assignments_created >= 750
      union all select 'assigns_1000'  where v_assignments_created >= 1000
      union all select 'assigns_1500'  where v_assignments_created >= 1500
      union all select 'assigns_2000'  where v_assignments_created >= 2000
      union all select 'assigns_3000'  where v_assignments_created >= 3000
      union all select 'master_of_puppets' where v_assignments_created >= 5000
      -- Teacher tenure / days since joined (9)
      union all select 'tenure_30'   where v_tenure_days >= 30
      union all select 'tenure_60'   where v_tenure_days >= 60
      union all select 'tenure_90'   where v_tenure_days >= 90
      union all select 'tenure_180'  where v_tenure_days >= 180
      union all select 'tenure_365'  where v_tenure_days >= 365
      union all select 'tenure_730'  where v_tenure_days >= 730
      union all select 'tenure_1095' where v_tenure_days >= 1095
      union all select 'tenure_1825' where v_tenure_days >= 1825
      union all select 'tenure_3650' where v_tenure_days >= 3650
      -- Lessons Authored (11)
      union all select 'authored_3'    where v_lessons_authored >= 3
      union all select 'authored_10'   where v_lessons_authored >= 10
      union all select 'authored_15'   where v_lessons_authored >= 15
      union all select 'authored_50'   where v_lessons_authored >= 50
      union all select 'authored_75'   where v_lessons_authored >= 75
      union all select 'authored_100'  where v_lessons_authored >= 100
      union all select 'authored_150'  where v_lessons_authored >= 150
      union all select 'authored_200'  where v_lessons_authored >= 200
      union all select 'authored_300'  where v_lessons_authored >= 300
      union all select 'authored_500'  where v_lessons_authored >= 500
      union all select 'authored_1000' where v_lessons_authored >= 1000
      -- Students Added (9, "She's a Mother" at 30)
      union all select 'students_3'   where v_students_added >= 3
      union all select 'students_5'   where v_students_added >= 5
      union all select 'students_15'  where v_students_added >= 15
      union all select 'students_25'  where v_students_added >= 25
      union all select 'shes_a_mother' where v_students_added >= 30
      union all select 'students_75'  where v_students_added >= 75
      union all select 'students_150' where v_students_added >= 150
      union all select 'students_200' where v_students_added >= 200
      union all select 'students_500' where v_students_added >= 500
      -- Students Certified (8)
      union all select 'certified_1'   where v_students_certified >= 1
      union all select 'certified_3'   where v_students_certified >= 3
      union all select 'certified_5'   where v_students_certified >= 5
      union all select 'certified_15'  where v_students_certified >= 15
      union all select 'certified_50'  where v_students_certified >= 50
      union all select 'certified_75'  where v_students_certified >= 75
      union all select 'certified_100' where v_students_certified >= 100
      union all select 'certified_250' where v_students_certified >= 250
      -- Certificates Issued (6)
      union all select 'certs_3'   where v_certificates_issued >= 3
      union all select 'certs_5'   where v_certificates_issued >= 5
      union all select 'certs_25'  where v_certificates_issued >= 25
      union all select 'certs_75'  where v_certificates_issued >= 75
      union all select 'certs_200' where v_certificates_issued >= 200
      union all select 'certs_500' where v_certificates_issued >= 500
      -- Classrooms Created (5 new beyond existing 1/3/5)
      union all select 'classrooms_2'  where v_classrooms_created >= 2
      union all select 'classrooms_7'  where v_classrooms_created >= 7
      union all select 'classrooms_10' where v_classrooms_created >= 10
      union all select 'classrooms_15' where v_classrooms_created >= 15
      union all select 'classrooms_20' where v_classrooms_created >= 20
      -- Simultaneous active classrooms (5)
      union all select 'concur_classrooms_2'  where v_active_classrooms >= 2
      union all select 'concur_classrooms_3'  where v_active_classrooms >= 3
      union all select 'concur_classrooms_5'  where v_active_classrooms >= 5
      union all select 'concur_classrooms_7'  where v_active_classrooms >= 7
      union all select 'concur_classrooms_10' where v_active_classrooms >= 10
      -- Concurrent active students (4)
      union all select 'concur_students_5'  where v_active_students >= 5
      union all select 'concur_students_15' where v_active_students >= 15
      union all select 'concur_students_30' where v_active_students >= 30
      union all select 'concur_students_50' where v_active_students >= 50
      -- Mentor Grants ladder (6)
      union all select 'mentor_10'   where v_mentor_grants >= 10
      union all select 'mentor_25'   where v_mentor_grants >= 25
      union all select 'mentor_50'   where v_mentor_grants >= 50
      union all select 'mentor_250'  where v_mentor_grants >= 250
      union all select 'mentor_500'  where v_mentor_grants >= 500
      union all select 'mentor_1000' where v_mentor_grants >= 1000
    ) t
    on conflict (student_id, badge_type) do nothing
    returning badge_type
  )
  select badge_type from inserted;
end;
$$;

-- One-shot backfill so existing teachers pick up what they've earned.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.award_eligible_badges(r.id);
  end loop;
end;
$$;
