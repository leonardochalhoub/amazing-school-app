-- V5: Track the moment a payment square is flipped to "Due" so the
-- hover tooltip can show both the due-insertion date and the pay date
-- for every cell.
alter table public.student_payments
  add column if not exists due_marked_at timestamptz;

create index if not exists student_payments_due_marked_idx
  on public.student_payments (teacher_id, billing_month)
  where due_marked_at is not null and paid = false;
