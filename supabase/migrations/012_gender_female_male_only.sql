-- V2.5: Simplify roster_students.gender to female | male (nullable).
-- Any existing 'other' values are set to NULL.

UPDATE roster_students SET gender = NULL WHERE gender = 'other';

ALTER TABLE roster_students DROP CONSTRAINT IF EXISTS roster_students_gender_check;

ALTER TABLE roster_students
  ADD CONSTRAINT roster_students_gender_check
  CHECK (gender IS NULL OR gender IN ('female','male'));
