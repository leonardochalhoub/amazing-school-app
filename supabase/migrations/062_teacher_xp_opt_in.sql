-- Teacher XP opt-in toggle.
--
-- Leveling + badges are on by default for students (their whole
-- reason for showing up), but teachers get a choice — some
-- professionals want to focus purely on their students' progress
-- without a personal scoreboard. Key rules:
--
--   - Default for existing teachers is OFF. They keep working
--     exactly as before until they flip the switch in
--     /teacher/profile.
--   - When OFF, the grantTeacherXp helper short-circuits and no
--     new xp_events / badges are written. The UI hides the XP bar
--     and the Badges nav tab.
--   - Flipping back ON is non-destructive: all historical xp_events
--     and badges remain. Pause → resume simply turns writes back on;
--     the teacher continues from where they were.
--
-- Students always have XP on; we set their default to true and
-- never expose the toggle on the student profile.

alter table public.profiles
  add column if not exists xp_enabled boolean not null default true;

-- Existing teachers: opt them out explicitly. Their prior state was
-- "no teacher XP at all" so this preserves that behaviour until they
-- actively enable it. Students stay on (default true).
update public.profiles
  set xp_enabled = false
  where role = 'teacher' and xp_enabled = true;
