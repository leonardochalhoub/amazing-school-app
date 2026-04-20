-- V5.5: Session heartbeats for precise time-on-site tracking.
--
-- A client-side hook pings this table every ~30s while the tab is
-- focused, and one last time on pagehide. Each row carries the
-- number of seconds accumulated since the previous flush, so the
-- sum per user_id is the real visible-tab time on the platform.
-- Tab-switch (visibilitychange → hidden) pauses accumulation;
-- closing the tab flushes the remainder via fetch keepalive.
--
-- Design:
--   - seconds CHECK keeps bad actors from writing arbitrary durations
--   - RLS lets a user insert rows for themselves only
--   - sysadmin reads via the admin (service-role) client, bypassing RLS
--   - user_id + at index supports the "last 30d" aggregation if we
--     ever want one

create table if not exists public.session_heartbeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seconds int not null check (seconds > 0 and seconds <= 300),
  at timestamptz not null default now()
);

create index if not exists session_heartbeats_user_at_idx
  on public.session_heartbeats (user_id, at desc);

alter table public.session_heartbeats enable row level security;

drop policy if exists "users insert own heartbeats"
  on public.session_heartbeats;
create policy "users insert own heartbeats"
  on public.session_heartbeats
  for insert
  with check (auth.uid() = user_id);

-- No SELECT policy — only the service-role client reads this, which
-- bypasses RLS. Clients never need to read their own heartbeats.
