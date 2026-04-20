-- V5.6: Decouple AI-tutor conversations from classrooms.
--
-- The original schema tied every conversation to a classroom via a
-- NOT NULL FK, but the AI tutor has no semantic link to classrooms
-- — it's a per-user feature. The chat page only resolved a
-- classroom to satisfy the constraint (classroom_members for
-- students, classrooms.teacher_id for teachers, null otherwise),
-- and the null branch silently dropped the insert, which meant
-- platform owners + any teacher who happened to not own a classroom
-- never had their tutor usage recorded.
--
-- Drop the NOT NULL. RLS still gates by student_id = auth.uid(),
-- so this doesn't widen anyone's access.

alter table public.conversations
  alter column classroom_id drop not null;
