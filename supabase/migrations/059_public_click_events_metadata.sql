-- Extend the click counter with request-time metadata so we can
-- analyse trends beyond the raw by-kind count (e.g. monthly
-- distribution by country, locale, logged-in vs anonymous, referer
-- source). Every column is nullable — missing values don't poison
-- aggregate queries.
--
-- Privacy notes:
--   · We never store the raw IP. ip_hash carries a salted SHA-256
--     so unique-visitor counts are possible without being able to
--     reverse back to a specific person.
--   · user_id is set only when a logged-in user clicks a tracked
--     link; anonymous visitors leave it NULL. FK cascades to NULL
--     on profile delete so the historical counter row survives.

ALTER TABLE public_click_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT,
  ADD COLUMN IF NOT EXISTS referer TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Secondary indexes on the columns most likely to drive future
-- analyses (monthly × country, monthly × kind × user-vs-anon).
CREATE INDEX IF NOT EXISTS idx_public_click_events_country_date
  ON public_click_events (country, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_click_events_user_date
  ON public_click_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public_click_events.user_id IS
  'Logged-in visitor who clicked; NULL for anonymous.';
COMMENT ON COLUMN public_click_events.ip_hash IS
  'SHA-256 of CLICK_IP_SALT || raw IP. Enables unique-visitor counts without storing reversible PII.';
COMMENT ON COLUMN public_click_events.country IS
  'ISO-3166 alpha-2 from Vercel x-vercel-ip-country header (e.g. BR, US).';
COMMENT ON COLUMN public_click_events.locale IS
  'UI locale active at the moment of the click (pt-BR / en).';
