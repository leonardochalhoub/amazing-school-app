-- V4 — Student payments. Owner-only CRM to track monthly tuition per student.
--
-- One row per (roster_student, billing_month). Payments are tied to the
-- roster entry (not the auth profile) so pending/unenrolled students are
-- also tracked. A trigger keeps updated_at fresh.
--
-- RLS: teachers see their own students' payment rows via teacher_id;
-- write access is via server actions that authorize using the admin client.

create table if not exists student_payments (
  id uuid primary key default gen_random_uuid(),
  roster_student_id uuid not null references roster_students(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  billing_month date not null,
  amount_cents integer,
  currency text not null default 'BRL',
  paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(roster_student_id, billing_month)
);

create index if not exists student_payments_teacher_month_idx
  on student_payments(teacher_id, billing_month);
create index if not exists student_payments_billing_month_idx
  on student_payments(billing_month);

alter table student_payments enable row level security;

create policy "Teachers see own student payments" on student_payments
  for select using (teacher_id = auth.uid());

-- Owner writes/updates through server actions using the service-role client
-- (bypasses RLS). We intentionally don't add an update/insert policy — any
-- direct client writes are rejected.

create or replace function touch_student_payments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_student_payments_updated_at on student_payments;
create trigger trg_student_payments_updated_at
  before update on student_payments
  for each row execute function touch_student_payments_updated_at();
