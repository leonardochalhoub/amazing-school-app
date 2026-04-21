-- V7.4: student_history.cefr_level
--
-- Teachers asked to tag every scheduled / held class with a CEFR
-- level (A1 / A2 / B1 / B2 / C1 / C2). The tag lets the
-- curriculum report attribute live-class minutes to the right
-- band when a student is working above or below their baseline
-- roster level, and lets the class log filter by band later on.

alter table public.student_history
  add column if not exists cefr_level text
    check (
      cefr_level is null
      or cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
    );
