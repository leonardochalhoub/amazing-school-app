-- V6.4: Persist + uniquely index receipt and certificate numbers
--
-- Until now the display numbers (AS-YYYYMM-XXXXXXXX and
-- AS-CERT-YYYYMM-XXXXXXXX) were derived at read time from the row
-- UUID. That's collision-safe in practice but there was no DB-level
-- guarantee. We now materialise them into columns with UNIQUE
-- constraints so Postgres itself enforces uniqueness, and we
-- auto-populate them on insert via a trigger — callers never have
-- to generate the number.

alter table public.student_payments
  add column if not exists receipt_number text;
alter table public.certificates
  add column if not exists certificate_number text;

-- Backfill existing rows with the same shape the app already used,
-- so no display numbers change from a user's perspective.
update public.student_payments
set receipt_number = 'AS-' ||
    to_char(billing_month, 'YYYYMM') || '-' ||
    upper(substr(replace(id::text, '-', ''), 1, 8))
where receipt_number is null;

update public.certificates
set certificate_number = 'AS-CERT-' ||
    to_char(issued_at, 'YYYYMM') || '-' ||
    upper(substr(replace(id::text, '-', ''), 1, 8))
where certificate_number is null;

-- Enforce uniqueness + not-null (after backfill).
alter table public.student_payments
  alter column receipt_number set not null;
alter table public.certificates
  alter column certificate_number set not null;

create unique index if not exists student_payments_receipt_number_idx
  on public.student_payments(receipt_number);
create unique index if not exists certificates_certificate_number_idx
  on public.certificates(certificate_number);

-- Auto-populate on insert so app code never has to generate a number.
-- The UUID's first 8 hex chars + YYYYMM give a 4.29B-suffix space per
-- month; combined with the UNIQUE constraint, collisions are
-- practically impossible AND explicitly rejected by the DB if the
-- impossible ever happens.
create or replace function fill_receipt_number()
returns trigger as $$
begin
  if new.receipt_number is null then
    new.receipt_number := 'AS-' ||
      to_char(new.billing_month, 'YYYYMM') || '-' ||
      upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function fill_certificate_number()
returns trigger as $$
begin
  if new.certificate_number is null then
    new.certificate_number := 'AS-CERT-' ||
      to_char(new.issued_at, 'YYYYMM') || '-' ||
      upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_fill_receipt_number on public.student_payments;
create trigger trg_fill_receipt_number
  before insert on public.student_payments
  for each row execute function fill_receipt_number();

drop trigger if exists trg_fill_certificate_number on public.certificates;
create trigger trg_fill_certificate_number
  before insert on public.certificates
  for each row execute function fill_certificate_number();
