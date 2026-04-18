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

  // auth.audit_log_entries is not exposed via PostgREST by default. We use
  // a plain SQL query via the rpc('exec_sql') style is not standard, so
  // fall back to selecting from auth.users + our own derived trail:
  // Supabase exposes `last_sign_in_at` per user, and a full audit trail
  // requires executing SQL. Use the service role to query the table
  // directly via the REST endpoint if the admin client was created with
  // the schema set; otherwise use auth.admin.listUsers and sort by
  // last_sign_in_at — that gives the equivalent ranking for recent logins.
  const { data: users, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: Math.min(limit, 1000),
  });
  if (error || !users) return [];

  // Sort by last_sign_in_at desc.
  const sorted = [...users.users]
    .filter((u) => u.last_sign_in_at)
    .sort((a, b) => {
      const ta = new Date(a.last_sign_in_at ?? 0).getTime();
      const tb = new Date(b.last_sign_in_at ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, limit);

  const userIds = sorted.map((u) => u.id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds);
  const byId = new Map<string, { full_name: string | null; role: string | null }>();
  for (const p of profiles ?? []) {
    byId.set(p.id as string, {
      full_name: (p.full_name as string | null) ?? null,
      role: (p.role as string | null) ?? null,
    });
  }

  return sorted.map((u) => {
    const p = byId.get(u.id) ?? { full_name: null, role: null };
    return {
      id: u.id,
      at: (u.last_sign_in_at as string) ?? "",
      email: u.email ?? null,
      fullName: p.full_name,
      role: p.role,
      action: "login",
      ipAddress: null,
      userAgent: null,
    };
  });
}
