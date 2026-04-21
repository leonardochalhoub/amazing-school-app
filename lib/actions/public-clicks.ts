import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Controlled vocabulary for the click counter. New surfaces must add
 * a new kind (and update the CHECK constraint in migration
 * 058_public_click_events.sql) rather than reusing an existing one,
 * so the running total stays interpretable.
 */
export type PublicClickKind =
  | "demo_teacher"
  | "demo_student"
  | "doc_teacher"
  | "doc_student_pt"
  | "doc_student_en";

export const PUBLIC_CLICK_KINDS: PublicClickKind[] = [
  "demo_teacher",
  "demo_student",
  "doc_teacher",
  "doc_student_pt",
  "doc_student_en",
];

export interface PublicClickMetadata {
  userId?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  country?: string | null;
  city?: string | null;
  locale?: string | null;
  ip?: string | null;
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.CLICK_IP_SALT ?? "amazing-school-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Fire-and-forget click logger. Swallows errors — missing table or
 * transient failures must never break the demo login or a
 * documentation redirect. Callers should not await the promise on
 * the critical path.
 *
 * Metadata is opportunistic — every field is nullable, so partial
 * context (e.g. missing locale cookie) still produces a valid row.
 */
export async function logPublicClick(
  kind: PublicClickKind,
  meta: PublicClickMetadata = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("public_click_events").insert({
      kind,
      user_id: meta.userId ?? null,
      ip_hash: hashIp(meta.ip),
      country: meta.country ?? null,
      city: meta.city ?? null,
      locale: meta.locale ?? null,
      referer: meta.referer ?? null,
      user_agent: meta.userAgent ?? null,
    });
  } catch (err) {
    console.error("[public-clicks] insert failed", err);
  }
}

/**
 * Pulls standard metadata out of a Next.js Request + an optional
 * signed-in user id. Handles Vercel's IP / geo headers and the
 * `locale` cookie set by the in-app toggle.
 */
export function extractClickMetadata(
  req: Request,
  userId: string | null = null,
): PublicClickMetadata {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    null;
  return {
    userId,
    ip,
    userAgent: h.get("user-agent"),
    referer: h.get("referer"),
    country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"),
    city: h.get("x-vercel-ip-city"),
    locale: parseLocaleFromCookie(h.get("cookie")),
  };
}

function parseLocaleFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  // The I18n context writes locale directly to localStorage, not a
  // cookie — but we still check both a `locale` cookie and the
  // `accept-language` header downstream if the app ever switches.
  const m = cookieHeader.match(/(?:^|;\s*)locale=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface PublicClickCounts {
  thisMonth: Record<PublicClickKind, number>;
  allTime: Record<PublicClickKind, number>;
}

/**
 * Reads counts for every tracked kind. "This month" is anchored to
 * the first day of the current calendar month in UTC — same boundary
 * as the rest of the sysadmin "this month" tiles.
 */
export async function getPublicClickCounts(): Promise<PublicClickCounts> {
  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  const empty = Object.fromEntries(
    PUBLIC_CLICK_KINDS.map((k) => [k, 0]),
  ) as Record<PublicClickKind, number>;

  try {
    const pairs = await Promise.all(
      PUBLIC_CLICK_KINDS.map(async (kind) => {
        const [monthRes, allRes] = await Promise.all([
          admin
            .from("public_click_events")
            .select("id", { count: "exact", head: true })
            .eq("kind", kind)
            .gte("occurred_at", monthStart),
          admin
            .from("public_click_events")
            .select("id", { count: "exact", head: true })
            .eq("kind", kind),
        ]);
        return [kind, monthRes.count ?? 0, allRes.count ?? 0] as const;
      }),
    );
    const thisMonth = { ...empty };
    const allTime = { ...empty };
    for (const [kind, m, a] of pairs) {
      thisMonth[kind] = m;
      allTime[kind] = a;
    }
    return { thisMonth, allTime };
  } catch (err) {
    console.error("[public-clicks] count read failed", err);
    return { thisMonth: empty, allTime: empty };
  }
}
