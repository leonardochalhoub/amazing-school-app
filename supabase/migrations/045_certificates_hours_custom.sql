-- V6.3: Certificate hours + custom titles
--
-- Adds a `total_hours` integer so the teacher can attribute a real
-- workload (platform estimate + live classes + homework). Stored in
-- hours, not minutes — the UI rounds before persisting.
--
-- The level column already accepts any short text, so "custom" is a
-- simple convention (no CHECK constraint to change). When
-- level='custom', the UI expects `title` to carry the free-form
-- certificate name, e.g. "English for Tech Professionals".

alter table public.certificates
  add column if not exists total_hours integer;
