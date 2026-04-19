-- Teacher-authored speaking-lab drills. Parallel of migration 022
-- (custom_speaking_dialogs). Each drill is a single target phrase the
-- student must say out loud. Drills are private to their author; when
-- is_public = true, students in classrooms owned by the author can see
-- them alongside the 100 built-in drills.

create table if not exists public.custom_speaking_drills (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  band text,
  focus text,
  target text not null,
  pt_hint text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_speaking_drills_teacher_idx
  on public.custom_speaking_drills (teacher_id, updated_at desc);
create index if not exists custom_speaking_drills_public_idx
  on public.custom_speaking_drills (is_public, updated_at desc)
  where is_public = true;

alter table public.custom_speaking_drills enable row level security;

create policy "teachers read own drills"
  on public.custom_speaking_drills for select
  using (auth.uid() = teacher_id);
create policy "teachers insert own drills"
  on public.custom_speaking_drills for insert
  with check (auth.uid() = teacher_id);
create policy "teachers update own drills"
  on public.custom_speaking_drills for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
create policy "teachers delete own drills"
  on public.custom_speaking_drills for delete
  using (auth.uid() = teacher_id);

create policy "students read teacher public drills"
  on public.custom_speaking_drills for select
  using (
    is_public = true
    and exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = auth.uid()
        and c.teacher_id = custom_speaking_drills.teacher_id
    )
  );
