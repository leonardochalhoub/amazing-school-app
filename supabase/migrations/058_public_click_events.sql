-- Lightweight click counter for public surfaces (demo logins +
-- documentation links). Each insert is a single row — no PII, no
-- IP, no user id. Sysadmin aggregates count(*) this-month and
-- all-time for the dashboard.
--
-- `kind` is a controlled vocabulary so adding / renaming targets
-- doesn't break past history: we never rename in place; we add a
-- new kind and keep the old rows so the running total stays
-- interpretable.

CREATE TABLE IF NOT EXISTS public_click_events (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN (
    'demo_teacher',
    'demo_student',
    'doc_teacher',
    'doc_student_pt',
    'doc_student_en'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_click_events_kind_date
  ON public_click_events (kind, occurred_at DESC);

-- Writes come from server actions using the service-role key; no
-- anon / authenticated role should be able to touch the table.
ALTER TABLE public_click_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public_click_events IS
  'Aggregate-only counter for demo-login and documentation clicks. Sysadmin dashboard reads counts by kind.';
