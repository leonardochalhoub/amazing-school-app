-- Fix infinite RLS recursion between classrooms ↔ classroom_members.
-- Two policies were cross-referencing each other's tables, causing Postgres
-- to loop when evaluating SELECT RLS on either table.
--
-- Solution: wrap the cross-table checks in SECURITY DEFINER functions so they
-- bypass RLS when evaluating the parent policy.

CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = p_classroom_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_classroom(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_members
    WHERE classroom_id = p_classroom_id AND student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_teacher_of_classroom(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_member_of_classroom(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_classroom(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_classroom(uuid) TO authenticated;

-- Replace the recursive policies with function-based versions.
DROP POLICY IF EXISTS "Students see joined classrooms" ON classrooms;
CREATE POLICY "Students see joined classrooms" ON classrooms
  FOR SELECT USING (public.is_member_of_classroom(id));

DROP POLICY IF EXISTS "Teachers see members of own classrooms" ON classroom_members;
CREATE POLICY "Teachers see members of own classrooms" ON classroom_members
  FOR SELECT USING (public.is_teacher_of_classroom(classroom_id));
