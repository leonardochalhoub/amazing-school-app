-- V2: DB-backed per-user daily AI rate limit.
-- Survives serverless cold starts; atomic via SECURITY INVOKER RPC.

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own usage" ON ai_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "User inserts own usage" ON ai_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own usage" ON ai_usage
  FOR UPDATE USING (user_id = auth.uid());

-- Atomic check-and-increment. Returns { allowed, remaining, count }.
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_window_date DATE,
  p_limit INT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  new_count INT;
  final_count INT;
BEGIN
  INSERT INTO ai_usage AS u (user_id, window_date, count)
  VALUES (p_user_id, p_window_date, 1)
  ON CONFLICT (user_id, window_date)
    DO UPDATE SET count = u.count + 1, updated_at = now()
    WHERE u.count < p_limit
  RETURNING count INTO new_count;

  IF new_count IS NULL THEN
    SELECT count INTO final_count
      FROM ai_usage
      WHERE user_id = p_user_id AND window_date = p_window_date;
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'count', COALESCE(final_count, p_limit)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, p_limit - new_count),
    'count', new_count
  );
END $$;

-- Allow authenticated users to invoke the RPC as themselves.
REVOKE ALL ON FUNCTION increment_ai_usage(UUID, DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_ai_usage(UUID, DATE, INT) TO authenticated;
