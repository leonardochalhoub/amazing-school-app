/**
 * Non-"use server" helpers for the teacher-signature feature. Signed
 * URLs are generated via the admin client so a short-lived link can
 * be rendered into the /print/* reports without exposing the private
 * `signatures` bucket. Unlike school logos (public), signatures are
 * legally sensitive — we never expose them through a public URL.
 */
import type { createAdminClient } from "@/lib/supabase/admin";

export const SIGNATURE_BUCKET = "signatures";
/** Signatures live under `{teacherId}.webp` inside the bucket. */
export function signaturePath(teacherId: string): string {
  return `${teacherId}.webp`;
}

/**
 * Generate a short-lived signed URL for a teacher's signature. Used
 * at report render time on the server. TTL is short (10 min) — plenty
 * for print preview + save-as-PDF, expires well before the URL could
 * leak downstream.
 */
export async function getSignatureSignedUrl(
  admin: ReturnType<typeof createAdminClient>,
  teacherId: string,
  ttlSeconds = 600,
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(signaturePath(teacherId), ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
