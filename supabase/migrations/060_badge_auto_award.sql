-- Badge awarding — database-authoritative, self-healing.
--
-- Previously awardEligibleBadges() lived only in TypeScript and was
-- called from two hot paths (signup + lesson completion) plus two
-- lazy reads (student dashboard, teacher view). That meant badges
-- could go stale any time a row was inserted outside those paths:
--   - a student's first 7-day streak wouldn't materialise until they
--     hit their dashboard again
--   - SQL backfills or admin edits never awarded anything
--   - a student who signed up before the signup hook was wired (e.g.
--     Tati) kept zero badges forever unless a teacher viewed them
--
-- This migration moves the logic into the DB as a single PL/pgSQL
-- function + a handful of triggers so badges become self-healing:
-- the instant a qualifying row lands in profiles / lesson_progress /
-- xp_events / daily_activity, the student's eligibility is re-
-- evaluated and any missing rows are upserted. Existing TS callers
-- stay as redundant safety nets (they're idempotent and cheap).
--
-- Certificate badges (cert_*) are intentionally NOT handled here —
-- those are issued by the /print/cert flow on explicit teacher
-- action.

-- ─── 1. Core eligibility function ────────────────────────────────
CREATE OR REPLACE FUNCTION award_eligible_badges(p_student_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_completed int := 0;
  v_music_completed   int := 0;
  v_conversations     int := 0;
  v_total_xp          int := 0;
  v_current_streak    int := 0;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN;
  END IF;

  -- Lessons vs. music counts (music uses the 'music:<slug>' prefix).
  SELECT
    coalesce(count(*) FILTER (WHERE lesson_slug NOT LIKE 'music:%'), 0),
    coalesce(count(*) FILTER (WHERE lesson_slug LIKE 'music:%'),     0)
  INTO v_lessons_completed, v_music_completed
  FROM lesson_progress
  WHERE student_id = p_student_id
    AND completed_at IS NOT NULL;

  -- AI-chat conversations ≈ xp_events rows with source='ai_chat'.
  SELECT coalesce(count(*), 0) INTO v_conversations
  FROM xp_events
  WHERE student_id = p_student_id
    AND source = 'ai_chat';

  -- Cumulative XP drives level badges. Level thresholds are the
  -- cumulative sums of xpToCross(i)=50·i²+50·i (see engine.ts):
  --   level 5  →      2000 XP
  --   level 10 →     16500 XP
  --   level 25 →    260000 XP
  --   level 50 →   2082500 XP
  SELECT coalesce(sum(xp_amount), 0) INTO v_total_xp
  FROM xp_events
  WHERE student_id = p_student_id;

  -- Current streak via islands-and-gaps: rows with consecutive dates
  -- share the same anchor (activity_date - row_number). The current
  -- streak is the length of the island whose last_day is today or
  -- yesterday — matching computeStreak() in engine.ts.
  WITH activity_distinct AS (
    SELECT DISTINCT activity_date
    FROM daily_activity
    WHERE student_id = p_student_id
  ),
  runs AS (
    SELECT
      activity_date,
      activity_date -
        (row_number() OVER (ORDER BY activity_date))::int AS grp
    FROM activity_distinct
  ),
  island_runs AS (
    SELECT count(*) AS run_len, max(activity_date) AS last_day
    FROM runs
    GROUP BY grp
  )
  SELECT coalesce(max(run_len), 0) INTO v_current_streak
  FROM island_runs
  WHERE last_day >= CURRENT_DATE - INTERVAL '1 day';

  -- Single idempotent insert. Every badge is expressed as a conditional
  -- row in the UNION; ON CONFLICT skips any the student already holds.
  RETURN QUERY
  WITH inserted AS (
    INSERT INTO badges (student_id, badge_type)
    SELECT p_student_id, t.badge_type
    FROM (
                  SELECT 'welcome_aboard'::text AS badge_type
        UNION ALL SELECT 'first_lesson'  WHERE v_lessons_completed >= 1
        UNION ALL SELECT 'five_lessons'  WHERE v_lessons_completed >= 5
        UNION ALL SELECT 'bookworm'      WHERE v_lessons_completed >= 25
        UNION ALL SELECT 'first_chat'    WHERE v_conversations     >= 1
        UNION ALL SELECT 'music_lover'   WHERE v_music_completed   >= 5
        UNION ALL SELECT 'level_5'       WHERE v_total_xp          >= 2000
        UNION ALL SELECT 'level_10'      WHERE v_total_xp          >= 16500
        UNION ALL SELECT 'level_25'      WHERE v_total_xp          >= 260000
        UNION ALL SELECT 'level_50'      WHERE v_total_xp          >= 2082500
        UNION ALL SELECT 'streak_7'      WHERE v_current_streak    >= 7
        UNION ALL SELECT 'streak_30'     WHERE v_current_streak    >= 30
        UNION ALL SELECT 'streak_90'     WHERE v_current_streak    >= 90
    ) t
    ON CONFLICT (student_id, badge_type) DO NOTHING
    RETURNING badge_type
  )
  SELECT badge_type FROM inserted;
END;
$$;

COMMENT ON FUNCTION award_eligible_badges(uuid) IS
  'Idempotent badge re-evaluation for a single student. Mirrors lib/gamification/award-badges.ts so app code and direct SQL share one source of truth.';

-- ─── 2. Trigger shim functions ───────────────────────────────────
-- Thin wrappers — most tables key off `student_id`, profiles keys
-- off `id`. Both fire after the row is durable so the function sees
-- the up-to-date snapshot.
CREATE OR REPLACE FUNCTION _trg_award_badges_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_eligible_badges(NEW.student_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION _trg_award_badges_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_eligible_badges(NEW.id);
  RETURN NEW;
END;
$$;

-- ─── 3. Attach triggers ──────────────────────────────────────────
-- profiles: every new profile picks up welcome_aboard automatically.
DROP TRIGGER IF EXISTS trg_award_badges_on_profile ON profiles;
CREATE TRIGGER trg_award_badges_on_profile
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION _trg_award_badges_profile();

-- lesson_progress: awards first_lesson / five_lessons / bookworm /
-- music_lover when completed_at transitions to non-null. We listen
-- to INSERT+UPDATE rather than try to gate on OLD.completed_at —
-- it keeps the trigger bulletproof and the function is idempotent
-- so the extra calls are harmless.
DROP TRIGGER IF EXISTS trg_award_badges_on_lesson_progress ON lesson_progress;
CREATE TRIGGER trg_award_badges_on_lesson_progress
AFTER INSERT OR UPDATE OF completed_at ON lesson_progress
FOR EACH ROW
WHEN (NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION _trg_award_badges_student();

-- xp_events: awards first_chat + level_*. Fires on every insert —
-- the function short-circuits on repeat rows.
DROP TRIGGER IF EXISTS trg_award_badges_on_xp_events ON xp_events;
CREATE TRIGGER trg_award_badges_on_xp_events
AFTER INSERT ON xp_events
FOR EACH ROW EXECUTE FUNCTION _trg_award_badges_student();

-- daily_activity: awards streak_*. Upserts touch this table once per
-- day per student, so the cost is negligible.
DROP TRIGGER IF EXISTS trg_award_badges_on_daily_activity ON daily_activity;
CREATE TRIGGER trg_award_badges_on_daily_activity
AFTER INSERT OR UPDATE ON daily_activity
FOR EACH ROW EXECUTE FUNCTION _trg_award_badges_student();

-- ─── 4. One-shot backfill for existing users ─────────────────────
-- Fires the function for every profile so anyone behind the curve
-- (e.g. users who signed up before the signup hook was wired) picks
-- up everything they've earned. Future rows will be handled by the
-- triggers above.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM profiles LOOP
    PERFORM award_eligible_badges(r.id);
  END LOOP;
END;
$$;
