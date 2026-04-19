/**
 * Non-"use server" module so constants and sync helpers can be exported
 * alongside the async server actions in lib/actions/school-logo.ts. A
 * "use server" file is only allowed to export async functions — any
 * sync export (const, sync function, type re-export) crashes the build.
 */

// Plain filename — no spaces, no dashes — so the URL is bulletproof
// across proxies, CDNs, and header rewrites. The original file is
// preserved alongside as `T - 2.png` for history.
export const SCHOOL_LOGO_SRC = "/branding/school-logo.png";

/**
 * Resolve a school_logo_url object path stored on profiles into a fully
 * qualified public URL. Logos live in the public `school-logos` bucket
 * (see migration 033), so no signed URL is needed.
 */
export function schoolLogoPublicUrl(path: string | null): string | null {
  if (!path) return null;
  // Cache-bust with updated_at-ish token is unnecessary because the
  // filename is `{userId}.webp` — upsert overwrites the same key.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/school-logos/${path}`;
}

const WHITELISTED_EMAILS = [
  "leochalhoub@hotmail.com",
  "tatianasequeira@yahoo.com.br",
];

function nameMatchesWhitelist(name: string): boolean {
  const n = name.toLowerCase().trim();
  if (!n) return false;
  if (n === "leonardo chalhoub" || n === "leo chalhoub") return true;
  if (n.includes("tatiana") && n.includes("sequeira")) return true;
  return false;
}

/**
 * True when this account is allowed to toggle the pre-set school logo
 * on/off. Whitelist today: Leo (platform owner) and any teacher named
 * "Tatiana Sequeira".
 */
export function isLogoEligible(
  email: string | null | undefined,
  fullName: string,
): boolean {
  const mail = (email ?? "").toLowerCase().trim();
  if (WHITELISTED_EMAILS.includes(mail)) return true;
  return nameMatchesWhitelist(fullName);
}
