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

/**
 * Fire-and-forget click logger. Swallows errors — missing table or
 * transient failures must never break the demo login or a
 * documentation redirect. Callers should not await the promise on
 * the critical path.
 */
export async function logPublicClick(kind: PublicClickKind): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("public_click_events").insert({ kind });
  } catch (err) {
    console.error("[public-clicks] insert failed", err);
  }
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
