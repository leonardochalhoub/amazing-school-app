-- V6.7: Ad-hoc service receipts (recibos avulsos)
--
-- student_payments is modelled around a strict (roster_student,
-- billing_month) pair. Teachers asked for a way to issue receipts
-- for one-off services — consultoria, tradução, mentoring — that
-- don't fit that shape. This table is the parallel entity:
-- decoupled from the tuition cycle, free-form description and
-- amount, optional link to an existing roster student, optional
-- link-free client (external party) with a client_name + CPF.

create table if not exists public.service_receipts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  -- Optional link to a student on the teacher's roster. When set,
  -- the client_name field still holds the legal name that prints
  -- on the receipt (defaults to the roster full_name but the
  -- teacher can override for a family member / company name).
  roster_student_id uuid
    references roster_students(id) on delete set null,
  client_name text not null,
  client_cpf text,
  -- Free-form service description, e.g. "Consultoria pedagógica",
  -- "Tradução de documentos acadêmicos", "Aulas particulares em
  -- grupo". Prints on the face of the receipt.
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  issued_on date not null,
  notes text,
  -- Human-readable receipt number. Auto-filled by trigger below,
  -- unique across the entire platform so it can't collide with
  -- tuition receipts (different prefix: AS-SVC vs AS-…).
  receipt_number text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists service_receipts_receipt_number_idx
  on public.service_receipts(receipt_number);

create index if not exists service_receipts_teacher_issued_idx
  on public.service_receipts(teacher_id, issued_on desc);

alter table public.service_receipts enable row level security;

drop policy if exists "Teacher reads own service receipts" on public.service_receipts;
create policy "Teacher reads own service receipts" on public.service_receipts
  for select using (teacher_id = auth.uid());
-- Writes go through server actions using the admin client — no
-- insert/update/delete policy exposed to the public client.

create or replace function fill_service_receipt_number()
returns trigger as $$
begin
  if new.receipt_number is null or new.receipt_number = '' then
    new.receipt_number := 'AS-SVC-' ||
      to_char(new.issued_on, 'YYYYMM') || '-' ||
      upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_fill_service_receipt_number on public.service_receipts;
create trigger trg_fill_service_receipt_number
  before insert on public.service_receipts
  for each row execute function fill_service_receipt_number();
