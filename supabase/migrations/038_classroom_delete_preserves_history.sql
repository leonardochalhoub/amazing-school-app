-- V5.7: Deleting a classroom should leave the STUDENT-owned
-- historical trail intact. Only the classroom itself — and the
-- plumbing rows that exist because of the classroom (memberships,
-- scheduled meetings, pending invitations) — should cease to exist.
--
-- Rows that belong to STUDENTS and happened to take place in a
-- classroom should survive with classroom_id set to NULL, so the
-- student can still see their assignment history, completions,
-- XP earned, AI-tutor chats, and notes the teacher wrote about
-- them — even if the class itself was torn down.
--
-- Before this migration each flip below was ON DELETE CASCADE +
-- NOT NULL, which wiped the row on classroom deletion. Several
-- earlier migrations already did this for specific tables
-- (024 lesson_assignments, 028 lesson_progress, 037 conversations,
-- 023 student_history, 006 roster_students). This migration
-- closes the gap for the remaining three:
--   - xp_events
-- - student_notes
-- - music_suggestions
--
-- SCOPE:
--   SET NULL (preserve): rows owned by a student
--   KEEP CASCADE (die with the classroom): rows that only make
--     sense as part of a live classroom
--       - classroom_members (the link itself)
--       - scheduled_classes (the meeting is for the classroom)
--       - student_invitations (pending invites to a dead classroom)
--
-- NOTE: This migration changes future behaviour only. Any data
-- already cascaded-deleted during earlier classroom deletions is
-- gone and can't be resurrected here.

-- xp_events --------------------------------------------------------
alter table public.xp_events
  alter column classroom_id drop not null;
alter table public.xp_events
  drop constraint if exists xp_events_classroom_id_fkey;
alter table public.xp_events
  add constraint xp_events_classroom_id_fkey
  foreign key (classroom_id)
  references public.classrooms(id)
  on delete set null;

-- student_notes ----------------------------------------------------
alter table public.student_notes
  alter column classroom_id drop not null;
alter table public.student_notes
  drop constraint if exists student_notes_classroom_id_fkey;
alter table public.student_notes
  add constraint student_notes_classroom_id_fkey
  foreign key (classroom_id)
  references public.classrooms(id)
  on delete set null;

-- music_suggestions ------------------------------------------------
alter table public.music_suggestions
  alter column classroom_id drop not null;
alter table public.music_suggestions
  drop constraint if exists music_suggestions_classroom_id_fkey;
alter table public.music_suggestions
  add constraint music_suggestions_classroom_id_fkey
  foreign key (classroom_id)
  references public.classrooms(id)
  on delete set null;
