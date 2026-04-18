-- Listening comprehension responses.
--
-- When a lesson includes a `listening_story` scene, the student writes a
-- free-form interpretation of what they heard. Responses are persisted
-- here so a teacher can score + give feedback later.

create table if not exists public.listening_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_slug text not null,
  scene_id text not null,
  response_text text not null,
  submitted_at timestamptz not null default now(),
  -- teacher side (all nullable until reviewed)
  teacher_feedback text,
  teacher_score int check (teacher_score between 0 and 100),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists listening_responses_student_idx
  on public.listening_responses (student_id, submitted_at desc);
create index if not exists listening_responses_lesson_idx
  on public.listening_responses (lesson_slug, submitted_at desc);
create index if not exists listening_responses_pending_idx
  on public.listening_responses (submitted_at desc)
  where reviewed_at is null;

alter table public.listening_responses enable row level security;

-- Students manage their own responses.
create policy "students read own listening responses"
  on public.listening_responses for select
  using (auth.uid() = student_id);

create policy "students insert own listening responses"
  on public.listening_responses for insert
  with check (auth.uid() = student_id);

-- Teachers can read + update responses from students in a classroom
-- they own (for feedback/scoring).
create policy "teachers read responses from their students"
  on public.listening_responses for select
  using (
    exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = listening_responses.student_id
        and c.teacher_id = auth.uid()
    )
  );

create policy "teachers review responses from their students"
  on public.listening_responses for update
  using (
    exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = listening_responses.student_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = listening_responses.student_id
        and c.teacher_id = auth.uid()
    )
  );
