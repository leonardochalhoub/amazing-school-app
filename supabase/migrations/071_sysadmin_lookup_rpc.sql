-- ═════════════════════════════════════════════════════════════════════════════
-- Reliable sysadmin-id lookup.
--
-- The app-side helper was scanning auth.users through the Supabase JS SDK
-- `listUsers` endpoint, which (a) paginates, (b) is slow, and (c) silently
-- returned an empty set for some projects even though the origin-owner
-- email was present — leaving the "Suggest update" flow throwing
-- "No sysadmins configured yet" at teachers.
--
-- This function is a single authoritative query: owner-role profiles
-- UNION any auth.users row whose email matches the platform owner
-- backstop. SECURITY DEFINER so the service role client can call it
-- without the caller needing direct auth schema access.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_all_sysadmin_ids()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.id AS user_id
  FROM profiles p
  WHERE p.role = 'owner'
  UNION
  SELECT u.id AS user_id
  FROM auth.users u
  WHERE lower(u.email) = 'leochalhoub@hotmail.com'
$$;

-- Service role only — clients never call this directly. Revoke the
-- default EXECUTE grant to authenticated + anon to be explicit.
REVOKE ALL ON FUNCTION public.get_all_sysadmin_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_sysadmin_ids() FROM anon;
REVOKE ALL ON FUNCTION public.get_all_sysadmin_ids() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_sysadmin_ids() TO service_role;
