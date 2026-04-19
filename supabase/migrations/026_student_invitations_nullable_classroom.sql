-- Allow inviting roster students who aren't in a classroom yet.
-- Every invitation must still target at least a roster student or email,
-- otherwise there's nothing for the invitee to bind to.

alter table public.student_invitations
  alter column classroom_id drop not null;

alter table public.student_invitations
  add constraint student_invitations_binding_required
  check (
    roster_student_id is not null
    or email is not null
    or classroom_id is not null
  );
