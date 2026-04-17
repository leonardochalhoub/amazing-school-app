-- V4.1 — Per-student tuition config: monthly amount + due day.
--
-- Once set, the Management view auto-generates a student_payments row for
-- every month from billing_starts_on up to the current month, so the owner
-- only has to click the checkbox when the money arrives.
--
-- billing_day is capped at 28 to avoid Feb/30-31 edge cases — the intent is
-- "every 10th", not "last day of month".

alter table roster_students
  add column if not exists monthly_tuition_cents integer,
  add column if not exists billing_day smallint check (billing_day between 1 and 28),
  add column if not exists billing_starts_on date;

create index if not exists roster_students_billing_active_idx
  on roster_students (teacher_id)
  where monthly_tuition_cents is not null;
