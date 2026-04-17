-- V2: Teacher-managed roster of students.
-- Not tied to auth: a teacher can add a student by name without waiting for signup.
-- Optional classroom link; optional email; optional teacher-uploaded photo.

CREATE TABLE IF NOT EXISTS roster_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  email TEXT,
  notes TEXT,
  has_avatar BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_students_teacher
  ON roster_students (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_roster_students_classroom
  ON roster_students (classroom_id)
  WHERE classroom_id IS NOT NULL;

ALTER TABLE roster_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher reads own roster" ON roster_students
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teacher inserts own roster" ON roster_students
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teacher updates own roster" ON roster_students
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teacher deletes own roster" ON roster_students
  FOR DELETE USING (teacher_id = auth.uid());

-- Storage policies for teacher-uploaded roster photos.
-- Path convention: 'roster/{roster_id}.webp' inside the existing `avatars` bucket.

DROP POLICY IF EXISTS "Teacher uploads roster avatar" ON storage.objects;
CREATE POLICY "Teacher uploads roster avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'roster/%.webp'
    AND EXISTS (
      SELECT 1 FROM roster_students r
      WHERE r.teacher_id = auth.uid()
        AND 'roster/' || r.id::text || '.webp' = storage.objects.name
    )
  );

DROP POLICY IF EXISTS "Teacher updates roster avatar" ON storage.objects;
CREATE POLICY "Teacher updates roster avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND name LIKE 'roster/%.webp'
    AND EXISTS (
      SELECT 1 FROM roster_students r
      WHERE r.teacher_id = auth.uid()
        AND 'roster/' || r.id::text || '.webp' = storage.objects.name
    )
  );

DROP POLICY IF EXISTS "Teacher deletes roster avatar" ON storage.objects;
CREATE POLICY "Teacher deletes roster avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND name LIKE 'roster/%.webp'
    AND EXISTS (
      SELECT 1 FROM roster_students r
      WHERE r.teacher_id = auth.uid()
        AND 'roster/' || r.id::text || '.webp' = storage.objects.name
    )
  );

DROP POLICY IF EXISTS "Teacher reads roster avatar" ON storage.objects;
CREATE POLICY "Teacher reads roster avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND name LIKE 'roster/%.webp'
    AND EXISTS (
      SELECT 1 FROM roster_students r
      WHERE r.teacher_id = auth.uid()
        AND 'roster/' || r.id::text || '.webp' = storage.objects.name
    )
  );
