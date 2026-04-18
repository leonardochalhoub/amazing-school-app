-- Teacher-authored Speaking Lab dialogs.
--
-- Each dialog is a sequence of turns. Each turn is either:
--   { "speaker": "ai",   "text": "...", "pt": "..." }       (TTS reads aloud)
--   { "speaker": "user", "target": "...", "pt_hint": "..." } (student records + scored)
--
-- Dialogs are private to the author by default. When `is_public` is true,
-- every student in a classroom belonging to that teacher can see the dialog
-- inside the Speaking Lab alongside the 10 built-in scenarios.

create table if not exists public.custom_speaking_dialogs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  character_name text,
  band text,
  pt_summary text,
  turns jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_speaking_dialogs_teacher_idx
  on public.custom_speaking_dialogs (teacher_id, updated_at desc);
create index if not exists custom_speaking_dialogs_public_idx
  on public.custom_speaking_dialogs (is_public, updated_at desc)
  where is_public = true;

alter table public.custom_speaking_dialogs enable row level security;

-- Teachers read, write, update, delete their own dialogs.
create policy "teachers read own dialogs"
  on public.custom_speaking_dialogs for select
  using (auth.uid() = teacher_id);
create policy "teachers insert own dialogs"
  on public.custom_speaking_dialogs for insert
  with check (auth.uid() = teacher_id);
create policy "teachers update own dialogs"
  on public.custom_speaking_dialogs for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
create policy "teachers delete own dialogs"
  on public.custom_speaking_dialogs for delete
  using (auth.uid() = teacher_id);

-- Students read public dialogs from their teachers only.
create policy "students read teacher public dialogs"
  on public.custom_speaking_dialogs for select
  using (
    is_public = true
    and exists (
      select 1
      from public.classroom_members m
      join public.classrooms c on c.id = m.classroom_id
      where m.student_id = auth.uid()
        and c.teacher_id = custom_speaking_dialogs.teacher_id
    )
  );
