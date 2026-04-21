-- V7.0: Correct profile.role for any account that is actually a
-- student (has a roster_students row pointing at them) but was
-- left as role='teacher' by the signup flow.
--
-- Background: `lib/actions/auth.ts` defaults role to 'teacher' when
-- a signup arrives without a valid invite token. Some students
-- whose invite tokens were missing / expired ended up with the
-- default role and then wrongly saw the teacher dashboard.
--
-- Criterion: if an auth user is referenced by roster_students.auth_user_id
-- AND the matching profile has role='teacher' (NOT 'owner'), flip to
-- 'student'. Owners are never touched. Existing real students keep
-- 'student'. New signups will be corrected on the fly by the
-- dashboard layout, but this migration handles the historical
-- backlog in one pass.

update public.profiles p
   set role = 'student'
 where p.role = 'teacher'
   and exists (
     select 1
       from public.roster_students r
      where r.auth_user_id = p.id
        and r.deleted_at is null
   );
