-- Student history: per-student log of past classes, scheduled sessions,
-- absences, reschedules, and make-up classes. Teachers see/edit the full
-- history of their own students. Students can read their own history.

create table if not exists public.student_history (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  roster_student_id uuid references public.roster_students(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete set null,
  event_date date not null,
  event_time time,
  status text not null check (status in (
    'Planned',
    'Done',
    'Absent',
    'Rescheduled by student',
    'Rescheduled by teacher',
    'Make up class'
  )),
  lesson_content text,
  skill_focus text[] not null default '{}',
  meeting_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_history_subject_check check (
    (student_id is not null and roster_student_id is null) or
    (student_id is null and roster_student_id is not null)
  )
);

create index if not exists student_history_teacher_date_idx
  on public.student_history (teacher_id, event_date desc);
create index if not exists student_history_student_date_idx
  on public.student_history (student_id, event_date desc)
  where student_id is not null;
create index if not exists student_history_roster_date_idx
  on public.student_history (roster_student_id, event_date desc)
  where roster_student_id is not null;

alter table public.student_history enable row level security;

create policy "teachers read own history"
  on public.student_history for select
  using (auth.uid() = teacher_id);
create policy "teachers insert own history"
  on public.student_history for insert
  with check (auth.uid() = teacher_id);
create policy "teachers update own history"
  on public.student_history for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
create policy "teachers delete own history"
  on public.student_history for delete
  using (auth.uid() = teacher_id);

create policy "students read own history"
  on public.student_history for select
  using (auth.uid() = student_id);
