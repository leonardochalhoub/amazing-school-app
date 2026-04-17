-- V3.2 — Teacher-generated student invitation links.
--
-- A teacher creates a `student_invitations` row; the token is a URL param
-- on the invite link. The link can attach to an existing roster_students row
-- (merging the invited auth user into the roster on claim) or create a new
-- classroom membership directly.

CREATE TABLE IF NOT EXISTS student_invitations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  teacher_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id         UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  roster_student_id    UUID REFERENCES roster_students(id) ON DELETE SET NULL,
  email                TEXT,
  display_name         TEXT,
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at          TIMESTAMPTZ,
  accepted_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_invitations_token
  ON student_invitations (token)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_invitations_teacher
  ON student_invitations (teacher_id, created_at DESC);

ALTER TABLE student_invitations ENABLE ROW LEVEL SECURITY;

-- Teacher reads + manages their own invitations.
DROP POLICY IF EXISTS "teacher reads own invitations" ON student_invitations;
CREATE POLICY "teacher reads own invitations"
  ON student_invitations FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher writes own invitations" ON student_invitations;
CREATE POLICY "teacher writes own invitations"
  ON student_invitations FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher updates own invitations" ON student_invitations;
CREATE POLICY "teacher updates own invitations"
  ON student_invitations FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher deletes own invitations" ON student_invitations;
CREATE POLICY "teacher deletes own invitations"
  ON student_invitations FOR DELETE
  USING (teacher_id = auth.uid());

-- Anyone with the token value (via query param) can look up the row via the
-- claim server action (service role). We intentionally do NOT grant anonymous
-- SELECT here — lookup happens server-side with admin client.

-- roster_students needs a nullable auth_user_id column so claims can link
-- the brand-new signup to an existing roster row.
ALTER TABLE roster_students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_students_auth_user
  ON roster_students (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
