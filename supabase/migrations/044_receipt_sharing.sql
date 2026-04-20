-- V6.2: Two-layer receipt sharing. The per-student
-- `receipts_visible_to_student` flag (migration 042) stays — it is
-- the master switch. On top of it we add a per-payment opt-in so
-- the teacher explicitly marks which receipts reach the student.
--
-- Rationale: a student may have 18 paid months but the teacher only
-- wants to share the last 3 for a visa application. The master
-- switch by itself would leak everything.
--
-- Student visibility rule (enforced in the server action):
--   roster_students.receipts_visible_to_student = true
--     AND student_payments.shared_with_student = true

alter table public.student_payments
  add column if not exists shared_with_student boolean not null default false,
  add column if not exists shared_with_student_at timestamptz;

-- Index to make "shared receipts for this student" fast.
create index if not exists student_payments_shared_idx
  on public.student_payments(roster_student_id, shared_with_student)
  where paid = true and shared_with_student = true;
