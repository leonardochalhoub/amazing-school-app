/**
 * Non-"use server" module so constants and sync helpers can be exported
 * alongside the async server actions in lib/actions/school-logo.ts. A
 * "use server" file is only allowed to export async functions — any
 * sync export (const, sync function, type re-export) crashes the build.
 */

export const SCHOOL_LOGO_SRC = "/branding/T%20-%202.png";

const WHITELISTED_EMAILS = ["leochalhoub@hotmail.com"];

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
