-- V2.5: Post-class log — observations teachers add after a scheduled class happens.
-- A class automatically transitions from upcoming → past once its scheduled_at is in the past.
-- `observations` is free-form text the teacher writes about how the class went.

ALTER TABLE scheduled_classes
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS completion_status TEXT
    CHECK (completion_status IS NULL OR completion_status IN ('held','cancelled','rescheduled')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_scheduled_classes_past
  ON scheduled_classes (classroom_id, scheduled_at DESC);

-- Extend RLS so the teacher can update observations (existing RLS covers ALL for created_by).
-- Current policy "Teachers manage schedule" already allows FOR ALL USING (created_by = auth.uid()).
