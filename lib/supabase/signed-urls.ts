import type { SupabaseClient } from "@supabase/supabase-js";

const AVATAR_TTL_SECONDS = 3600;

export async function getAvatarSignedUrl(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(`${userId}.webp`, AVATAR_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getAvatarSignedUrls(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const results = await Promise.all(
    userIds.map(async (id) => [id, await getAvatarSignedUrl(supabase, id)] as const)
  );
  const out: Record<string, string> = {};
  for (const [id, url] of results) {
    if (url) out[id] = url;
  }
  return out;
}
