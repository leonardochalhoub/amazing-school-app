-- V5.9: Soft-delete classrooms so historical rows keep a readable
-- classroom name instead of showing "—" once the classroom is gone.
-- Previous approach (hard DELETE + ON DELETE SET NULL on child
-- tables) preserved the rows but erased the name — the class log
-- and student lesson history dropped their classroom tag to null,
-- which the user flagged as losing important context.
--
-- New approach: deleting a classroom stamps `deleted_at = now()`.
-- The row stays, so every query that joins classroom(name) still
-- resolves. Active-classroom lists filter on `deleted_at IS NULL`
-- so deleted classrooms disappear from UI navigation but remain
-- visible as labels on history.
--
-- Earlier migrations (024 / 028 / 037 / 023 / 006 / 038 / 039)
-- that flipped child-table FKs to SET NULL stay in place as a
-- defence-in-depth: if an admin ever hard-deletes a classroom
-- via direct SQL, children still survive as orphans instead of
-- cascading away.

alter table public.classrooms
  add column if not exists deleted_at timestamptz;

-- Invite codes need to be unique only among LIVE classrooms, so a
-- teacher can reuse a code after archiving an old one. Replace the
-- plain unique constraint with a partial unique index scoped to
-- non-deleted rows.
alter table public.classrooms
  drop constraint if exists classrooms_invite_code_key;
create unique index if not exists classrooms_invite_code_live_idx
  on public.classrooms (invite_code)
  where deleted_at is null;

-- Fast filter for "teachers' active classrooms" — every teacher
-- dashboard query uses this predicate.
create index if not exists classrooms_teacher_active_idx
  on public.classrooms (teacher_id)
  where deleted_at is null;
