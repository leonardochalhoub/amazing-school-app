-- V5.2: Per-teacher toggle for the white-label school logo at the top
-- of the navbar. When true, the branding image wired for that teacher
-- is shown centered above the nav. Default OFF for every profile.
alter table public.profiles
  add column if not exists school_logo_enabled boolean not null default false;
