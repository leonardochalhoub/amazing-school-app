import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function hasServiceRole(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureProfile(
  supabase: SupabaseClient,
  id: string,
  fullName: string,
  role: "teacher" | "student"
): Promise<void> {
  await supabase.from("profiles").upsert({ id, full_name: fullName, role });
}

export async function cleanupProfiles(
  supabase: SupabaseClient,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await supabase.from("profiles").delete().in("id", ids);
}
