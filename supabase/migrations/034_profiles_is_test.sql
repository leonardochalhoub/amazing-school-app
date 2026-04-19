-- V5.4: Flag for test accounts (demo users, staging teachers, any
-- non-real human). Sysadmin dashboards filter these out so the
-- owner sees only real-world usage.
alter table public.profiles
  add column if not exists is_test boolean not null default false;

create index if not exists profiles_is_test_idx
  on public.profiles (is_test)
  where is_test = true;

-- Seed: every demo.* email is a test account.
update public.profiles p
set is_test = true
from auth.users u
where u.id = p.id
  and lower(u.email) like 'demo.%@amazingschool.app';
