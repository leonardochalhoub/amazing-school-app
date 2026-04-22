import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Single source of truth for "last active" per auth user. Every
 * sysadmin surface that shows a "Last active" column must derive
 * from this helper — no more per-table drift like the Recent
 * Activity panel saying 22/04 11:07 while the All Students table
 * said 21/04 09:52.
 *
 * Sources, merged via MAX:
 *   1. session_heartbeats.at — 30s focused-tab ping
 *   2. auth.users.last_sign_in_at — fresh sign-in timestamp
 *      (doesn't update on silent cookie refresh, so step 1 catches
 *       those)
 *
 * Returns a Map keyed by auth user id. Users with neither source
 * are absent (caller renders "—").
 */
export async function getLastActiveByUser(): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const out = new Map<string, string>();

  const [{ data: users }, { data: hbRows }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin
      .from("session_heartbeats")
      .select("user_id, at")
      .order("at", { ascending: false })
      .limit(5000),
  ]);

  // Heartbeats first — first row per user_id is the newest because
  // the query is ordered desc.
  for (const r of (hbRows ?? []) as Array<{ user_id: string; at: string }>) {
    if (!out.has(r.user_id)) out.set(r.user_id, r.at);
  }

  // Sign-in timestamps — promote when newer than the heartbeat.
  for (const u of users?.users ?? []) {
    if (!u.last_sign_in_at) continue;
    const prev = out.get(u.id);
    if (!prev || u.last_sign_in_at > prev) out.set(u.id, u.last_sign_in_at);
  }

  return out;
}
