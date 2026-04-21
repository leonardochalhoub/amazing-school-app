-- V7.2: speaking_events — microphone activations logged from the
-- Speaking Lab so teachers can see how much each student talks.
--
-- Each mic start/stop cycle writes one row: when recording began,
-- how many milliseconds it lasted, and (optional) a free-form
-- context tag for grouping (drill slug, speaking-board id, etc.).
-- Duration is nullable so we can log the *start* immediately and
-- patch the duration on upload — prevents losing activity when the
-- user never releases the mic.

create table if not exists public.speaking_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  context text,
  created_at timestamptz not null default now()
);

create index if not exists speaking_events_student_idx
  on public.speaking_events (student_id, started_at desc);

alter table public.speaking_events enable row level security;

create policy "students write own speaking events"
  on public.speaking_events for insert
  with check (auth.uid() = student_id);

create policy "students read own speaking events"
  on public.speaking_events for select
  using (auth.uid() = student_id);

create policy "students update own speaking events"
  on public.speaking_events for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Teachers can read events from students in their classrooms OR on
-- their roster (whether the student has auth yet or not).
create policy "teachers read their students speaking events"
  on public.speaking_events for select
  using (
    exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = speaking_events.student_id
        and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.roster_students r
      where r.auth_user_id = speaking_events.student_id
        and r.teacher_id = auth.uid()
    )
  );
