-- V5.5: Move the platform-owner from a hardcoded email constant in
-- application code into a real role on profiles, and record every
-- role change in an audit log.

-- 1. Extend profiles.role to include 'owner'. Single CHECK constraint.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('teacher', 'student', 'owner'));

-- 2. Bootstrap: seed the current hardcoded owner email as role='owner'.
--    Safe to re-run; if the owner already has the role it's a no-op.
update public.profiles p
set role = 'owner'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'leochalhoub@hotmail.com'
  and p.role <> 'owner';

-- 3. Audit trail. Every grant / revoke writes one row here.
create table if not exists public.role_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  previous_role text not null,
  new_role text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists role_audit_log_subject_idx
  on public.role_audit_log (subject_id, created_at desc);

create index if not exists role_audit_log_actor_idx
  on public.role_audit_log (actor_id, created_at desc);

-- 4. RLS: owners read via direct query; writes go through server
--    actions using the service-role (admin) client, so no INSERT /
--    UPDATE policies are defined.
alter table public.role_audit_log enable row level security;

drop policy if exists "owners read role audit log" on public.role_audit_log;
create policy "owners read role audit log"
  on public.role_audit_log
  for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'owner'
  );

-- 5. Record the bootstrap grant itself so the audit timeline starts
--    from the migration, not from an empty slate.
insert into public.role_audit_log (actor_id, subject_id, previous_role, new_role, reason)
select null, p.id, 'teacher', 'owner',
       'bootstrap — migration 035 (profiles.role = owner)'
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'leochalhoub@hotmail.com'
  and not exists (
    select 1 from public.role_audit_log l
    where l.subject_id = p.id and l.new_role = 'owner'
  );
