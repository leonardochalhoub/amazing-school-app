-- V6.1: Certificates — teachers award formal CEFR-completion
-- certificates to their students with a grade (A/B/C), CEFR level,
-- and course period. Students see their own certificates in Profile
-- once issued, with a /print/certificate/[id] route that renders
-- a Harvard/MIT-styled document.
--
-- We use "certificate" (PT-BR: Certificado) rather than "diploma"
-- because industry standard for CEFR language programs —
-- Cambridge, Cultura Inglesa, CCAA, Britannia — all issue
-- "Certificados de Conclusão" at semester boundaries. "Diploma"
-- is reserved for multi-year degree programs.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  roster_student_id uuid not null references roster_students(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  -- Level code — see lib/reports/certificate-levels.ts. Short
  -- stringly-typed to keep the DB flexible; UI validates the set.
  level text not null,
  -- Single-letter grade. Could be expanded to A+/A-/… later.
  grade text not null check (grade in ('A', 'B', 'C')),
  -- Course duration. `course_start_on` defaults to the roster's
  -- billing_starts_on but can be overridden.
  course_start_on date not null,
  course_end_on date not null,
  -- Optional free-form title override. Null → "Certificado de
  -- Conclusão · {level label}".
  title text,
  -- Optional teacher note printed on the face of the certificate.
  remarks text,
  issued_at timestamptz not null default now()
);

create index if not exists certificates_roster_idx
  on public.certificates(roster_student_id, issued_at desc);
create index if not exists certificates_teacher_idx
  on public.certificates(teacher_id, issued_at desc);

alter table public.certificates enable row level security;

-- Teachers read the certificates they issued. Students read the
-- certificates tied to their own roster row. All writes go through
-- server actions using the admin client — no public insert/update
-- policies, so direct client writes are rejected.
drop policy if exists "Teacher reads own issued certificates" on public.certificates;
create policy "Teacher reads own issued certificates" on public.certificates
  for select using (teacher_id = auth.uid());

drop policy if exists "Student reads own certificates" on public.certificates;
create policy "Student reads own certificates" on public.certificates
  for select using (
    exists (
      select 1 from public.roster_students rs
      where rs.id = certificates.roster_student_id
        and rs.auth_user_id = auth.uid()
        and rs.deleted_at is null
    )
  );
