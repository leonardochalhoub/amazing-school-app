import { createClient } from "@/lib/supabase/server";

/**
 * Email of the platform owner — has access to the Management CRM on top of
 * everything a teacher can see. Intentionally hard-coded (not DB-driven)
 * because there's exactly one owner and we want zero-risk-of-escalation.
 */
export const OWNER_EMAIL = "leochalhoub@hotmail.com";

export async function isOwner(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return user.email.toLowerCase().trim() === OWNER_EMAIL;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === OWNER_EMAIL;
}
