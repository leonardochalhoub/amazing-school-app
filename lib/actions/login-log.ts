"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

export interface LoginLogEntry {
  id: string;
  at: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Return the most recent successful login events, joined to the public
 * profile for display. Owner-only — callers who are not the owner get
 * an empty array.
 *
 * Reads from Supabase's built-in `auth.audit_log_entries`, which records
 * every auth event. We filter to `login` actions only (ignoring logout,
 * refresh_token, user_modified, etc).
 */
export async function listRecentLogins(
  limit = 100,
): Promise<LoginLogEntry[]> {
  const ok = await isOwner();
  if (!ok) return [];

  const admin = createAdminClient();

  // Supabase's `last_sign_in_at` only updates on a fresh sign-in —
  // when a user comes back with an unexpired cookie, their token is
  // silently refreshed and the field stays put. That makes
  // last_sign_in_at useless as a "when were you last here" metric.
  // We merge it with the most recent row in session_heartbeats (the
  // 30s ping every authenticated page writes) and surface whichever
  // is newer, so a visit that reuses an existing session still
  // registers on this log.
  const { data: users, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: Math.min(limit, 1000),
  });
  if (error || !users) return [];

  // Exclusion rules for the "Atividade recente" panel:
  //   1. Demo accounts (email prefix `demo.`) — platform vitrine,
  //      not real users.
  //   2. The platform owner (Leo) and every student he coaches —
  //      Leo uses the site for dev + QA so his sessions flood the
  //      panel and drown out other teachers' activity.
  //
  // Step 1 — resolve Leo's user id from his whitelisted email, then
  // find all roster_students he owns so we can hide their auth ids too.
  const OWNER_EMAIL = "leochalhoub@hotmail.com";
  const ownerUser = users.users.find(
    (u) => (u.email ?? "").toLowerCase() === OWNER_EMAIL,
  );
  const excludedIds = new Set<string>();
  if (ownerUser) {
    excludedIds.add(ownerUser.id);
    const { data: leoStudents } = await admin
      .from("roster_students")
      .select("auth_user_id")
      .eq("teacher_id", ownerUser.id)
      .not("auth_user_id", "is", null);
    for (const r of (leoStudents ?? []) as { auth_user_id: string }[]) {
      if (r.auth_user_id) excludedIds.add(r.auth_user_id);
    }
  }

  const isDemoEmail = (email: string | null | undefined) =>
    (email ?? "").toLowerCase().startsWith("demo.");

  const visibleUsers = users.users.filter(
    (u) => !excludedIds.has(u.id) && !isDemoEmail(u.email),
  );

  const allIds = visibleUsers.map((u) => u.id);
  const [{ data: profiles }, { data: heartbeats }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role").in("id", allIds),
    admin
      .from("session_heartbeats")
      .select("user_id, at")
      .in("user_id", allIds)
      .order("at", { ascending: false })
      .limit(2000),
  ]);

  const byId = new Map<
    string,
    { full_name: string | null; role: string | null }
  >();
  for (const p of profiles ?? []) {
    byId.set(p.id as string, {
      full_name: (p.full_name as string | null) ?? null,
      role: (p.role as string | null) ?? null,
    });
  }

  // Most recent heartbeat per user — the query is ordered desc so the
  // first row for a given user_id is the one we want.
  const lastHb = new Map<string, string>();
  for (const h of (heartbeats ?? []) as { user_id: string; at: string }[]) {
    if (!lastHb.has(h.user_id)) lastHb.set(h.user_id, h.at);
  }

  const effectiveAt = (u: (typeof users.users)[number]): string | null => {
    const signIn = u.last_sign_in_at ?? null;
    const hb = lastHb.get(u.id) ?? null;
    if (!signIn) return hb;
    if (!hb) return signIn;
    return new Date(hb).getTime() > new Date(signIn).getTime() ? hb : signIn;
  };

  const sorted = [...visibleUsers]
    .filter((u) => effectiveAt(u))
    .sort((a, b) => {
      const ta = new Date(effectiveAt(a) ?? 0).getTime();
      const tb = new Date(effectiveAt(b) ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, limit);

  return sorted.map((u) => {
    const p = byId.get(u.id) ?? { full_name: null, role: null };
    return {
      id: u.id,
      at: effectiveAt(u) ?? "",
      email: u.email ?? null,
      fullName: p.full_name,
      role: p.role,
      action: "login",
      ipAddress: null,
      userAgent: null,
    };
  });
}
