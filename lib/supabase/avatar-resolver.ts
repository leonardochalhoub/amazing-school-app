import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvatarSignedUrl } from "@/lib/supabase/signed-urls";

/**
 * Resolves the best avatar URL for the signed-in user, checking in order:
 *   1. Their own upload        → storage:avatars/{user.id}.webp
 *   2. Roster avatar the teacher set before they signed up
 *      → storage:avatars/roster/{roster.id}.webp
 * Returns null when nothing is available (UI falls back to initials).
 *
 * Accepts both the Supabase user-scoped client (for signed-URL generation
 * against the `avatars` bucket) and the admin client (for roster + profiles
 * lookup that would otherwise trip RLS).
 */
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveMyAvatarUrl(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Own upload
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if ((profile as { avatar_url?: string | null } | null)?.avatar_url) {
    const own = await getAvatarSignedUrl(supabase, userId);
    if (own) return own;
  }

  // 2. Roster avatar (teacher uploaded before signup). Storage RLS lets
  // only teachers read roster/*.webp, so we sign via the admin client.
  // Authorization is still sound — we require auth_user_id to match.
  const { data: roster } = await admin
    .from("roster_students")
    .select("id, has_avatar")
    .eq("auth_user_id", userId)
    .maybeSingle();
  const rosterRow = roster as {
    id: string;
    has_avatar: boolean;
  } | null;
  if (rosterRow?.has_avatar) {
    const path = `roster/${rosterRow.id}.webp`;
    const { data } = await admin.storage
      .from("avatars")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }

  return null;
}
