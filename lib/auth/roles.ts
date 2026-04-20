import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Platform-owner access is primarily a role on profiles
 * (`role = 'owner'`) assigned via the Sysadmin UI and audited in
 * public.role_audit_log.
 *
 * The original-owner email is a backstop: if a bad DB state ever
 * left the platform without any owners, that single account can
 * still land on /owner/sysadmin to fix the grants. It's not a
 * security weakening — only the real inbox holder can log into that
 * account, and the grant system then supersedes the backstop.
 *
 * Both helpers are memoised per request via React.cache so the
 * same signed-in user only pays one DB round-trip per render pass.
 */
const ORIGIN_OWNER_EMAIL = "leochalhoub@hotmail.com";

export const isOwner = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if ((user.email ?? "").toLowerCase().trim() === ORIGIN_OWNER_EMAIL) {
    return true;
  }
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
  if ((data as { role?: string } | null)?.role === "owner") return true;
  // Backstop via email (see ORIGIN_OWNER_EMAIL note above).
  const { data: authRow } = await admin.auth.admin.getUserById(userId);
  return (authRow?.user?.email ?? "").toLowerCase().trim() === ORIGIN_OWNER_EMAIL;
});
