import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Platform-owner access is now a role on profiles (`role = 'owner'`)
 * rather than a hardcoded email. Grants and revokes go through the
 * owner-management server action and land in public.role_audit_log.
 *
 * Both helpers here are memoised per request via React.cache so the
 * same signed-in user only pays one DB round-trip per render pass.
 */

export const isOwner = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return (data as { role?: string } | null)?.role === "owner";
});

/**
 * Variant that takes a specific user id — useful for server components
 * that already have it and want to skip the auth-fetch round trip.
 */
export const isOwnerById = cache(async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data as { role?: string } | null)?.role === "owner";
});
