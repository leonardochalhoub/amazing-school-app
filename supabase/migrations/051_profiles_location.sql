-- V6.9: profiles.location
--
-- Students wanted to surface where they live on their profile
-- (city + state / country, free-form). It's a soft social detail
-- — not required for anything, not validated, just useful context
-- for teachers who pick up a class mid-stream and for classmates
-- who see the leaderboard.
--
-- Keeping it as a single free-form text column (capped at 80 chars)
-- so students can write "São Paulo, SP" or "Tokyo" or whatever
-- feels right, without forcing a structured city/state picker.

alter table public.profiles
  add column if not exists location text check (
    location is null or char_length(location) between 1 and 80
  );
