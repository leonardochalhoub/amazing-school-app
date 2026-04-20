-- V5.8: Preserve past scheduled_classes rows when a classroom is
-- deleted. The original FK cascaded every meeting away with the
-- classroom — wiping the ledger of classes that actually happened,
-- which is history the teacher should keep.
--
-- Flip to ON DELETE SET NULL + nullable column. The sibling change
-- in /lib/actions/classroom.ts (deleteClassroom) now proactively
-- deletes ONLY the FUTURE rows (scheduled_at > now) before
-- removing the classroom, so:
--
--   - Past meetings (scheduled_at <= now) survive with
--     classroom_id = NULL, preserving the log of what happened.
--   - Future meetings (planned but never held) disappear because
--     they don't make sense once the classroom is gone.

alter table public.scheduled_classes
  alter column classroom_id drop not null;
alter table public.scheduled_classes
  drop constraint if exists scheduled_classes_classroom_id_fkey;
alter table public.scheduled_classes
  add constraint scheduled_classes_classroom_id_fkey
  foreign key (classroom_id)
  references public.classrooms(id)
  on delete set null;
