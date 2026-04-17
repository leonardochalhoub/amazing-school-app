-- V2: Avatars Storage bucket + RLS.
-- profiles.avatar_url already exists from migration 001 — no column change.
-- Lesson metadata (CEFR sub-level, sources) lives inside lesson JSON files, not the DB.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: object name is '{user_id}.webp'.

DROP POLICY IF EXISTS "Owner uploads own avatar" ON storage.objects;
CREATE POLICY "Owner uploads own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND name = auth.uid()::text || '.webp'
  );

DROP POLICY IF EXISTS "Owner updates own avatar" ON storage.objects;
CREATE POLICY "Owner updates own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND name = auth.uid()::text || '.webp'
  );

DROP POLICY IF EXISTS "Owner deletes own avatar" ON storage.objects;
CREATE POLICY "Owner deletes own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND name = auth.uid()::text || '.webp'
  );

-- Reads: self, classmates (via shared classroom), and teachers of classrooms the student is in.
DROP POLICY IF EXISTS "Classmates and teachers read avatars" ON storage.objects;
CREATE POLICY "Classmates and teachers read avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (
      name = auth.uid()::text || '.webp'
      OR EXISTS (
        SELECT 1
        FROM classroom_members cm_self
        JOIN classroom_members cm_other
          ON cm_self.classroom_id = cm_other.classroom_id
        WHERE cm_self.student_id = auth.uid()
          AND cm_other.student_id::text || '.webp' = storage.objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM classrooms c
        JOIN classroom_members cm ON cm.classroom_id = c.id
        WHERE c.teacher_id = auth.uid()
          AND cm.student_id::text || '.webp' = storage.objects.name
      )
    )
  );
