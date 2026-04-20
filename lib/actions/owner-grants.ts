"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

// Origin owner: always counted as an owner regardless of what
// profiles.role says. Mirrors the backstop in lib/auth/roles.ts
// so that listOwners/revoke etc. stay consistent even when
// migration 035 hasn't run in this environment yet.
const ORIGIN_OWNER_EMAIL = "leochalhoub@hotmail.com";

/**
 * Grant / revoke owner privileges. Every state change lands in
 * public.role_audit_log so there's a permanent trail of who gave
 * who what role, when, and why.
 *
 * Rules:
 *   - Only an existing owner can grant or revoke.
 *   - Revoking the last remaining owner is blocked (locks nobody out).
 *   - Subject must be an active profile (teacher, student, or owner).
 *   - Self-revoke is allowed as long as there's another owner left.
 */

const GrantSchema = z.object({
  subjectId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const EmailSchema = z.object({
  email: z.string().email(),
  reason: z.string().max(500).optional(),
});

async function requireOwner(): Promise<
  { actorId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!(await isOwner())) return { error: "Owner access only" };
  return { actorId: user.id };
}

export async function grantOwnerRole(
  input: z.input<typeof GrantSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = GrantSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { data: subject } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", parsed.data.subjectId)
    .maybeSingle();
  const subj = subject as { id: string; role: string } | null;
  if (!subj) return { error: "Subject profile not found" };
  if (subj.role === "owner") return { error: "Already an owner" };

  const previousRole = subj.role;
  const { error } = await admin
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", subj.id);
  if (error) return { error: error.message };

  await admin.from("role_audit_log").insert({
    actor_id: auth.actorId,
    subject_id: subj.id,
    previous_role: previousRole,
    new_role: "owner",
    reason: parsed.data.reason ?? null,
  });

  revalidatePath("/owner/sysadmin");
  return { success: true };
}

export async function grantOwnerByEmail(
  input: z.input<typeof EmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = EmailSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid email" };
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  // Resolve email → user id via the auth admin API, then use the
  // grantOwnerRole path (cleaner + single audit entry).
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const target = (userList?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (!target) return { error: "No account with that email" };
  return grantOwnerRole({ subjectId: target.id, reason: parsed.data.reason });
}

export async function revokeOwnerRole(
  input: z.input<typeof GrantSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = GrantSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { data: subject } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", parsed.data.subjectId)
    .maybeSingle();
  const subj = subject as { id: string; role: string } | null;
  if (!subj) return { error: "Subject profile not found" };

  // Origin-owner guard: the bootstrap seed account is permanent.
  // Even if their profile.role still reads "teacher" (pre-035),
  // they count as an owner and can't be revoked here.
  const { data: subjAuth } = await admin.auth.admin.getUserById(subj.id);
  const subjEmail = (subjAuth?.user?.email ?? "").toLowerCase().trim();
  if (subjEmail === ORIGIN_OWNER_EMAIL) {
    return { error: "Can't revoke the origin owner." };
  }

  if (subj.role !== "owner") return { error: "Subject is not an owner" };

  // Lockout guard: never demote the last remaining owner.
  const { count: ownerCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");
  if ((ownerCount ?? 0) <= 1) {
    return {
      error:
        "Can't revoke the last remaining owner. Grant another account first.",
    };
  }

  // Demote back to teacher by default — owners are almost always
  // teachers before promotion. The audit log keeps the previous
  // role so the true demotion target can be reconstructed if needed.
  const nextRole = "teacher";
  const { error } = await admin
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", subj.id);
  if (error) return { error: error.message };

  await admin.from("role_audit_log").insert({
    actor_id: auth.actorId,
    subject_id: subj.id,
    previous_role: "owner",
    new_role: nextRole,
    reason: parsed.data.reason ?? null,
  });

  revalidatePath("/owner/sysadmin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Read-side helpers used by the sysadmin Platform access card.
// ---------------------------------------------------------------------------

export interface OwnerRow {
  id: string;
  fullName: string;
  email: string | null;
  grantedAt: string | null;
  // The origin owner is the bootstrap seed — they can never be
  // revoked, even if they are not the only owner. Keeps at least
  // one deterministic lockout-proof account on the platform.
  isOrigin?: boolean;
}

export interface AuditRow {
  id: string;
  actorName: string | null;
  subjectName: string | null;
  previousRole: string;
  newRole: string;
  reason: string | null;
  createdAt: string;
}

export async function listOwners(): Promise<OwnerRow[]> {
  if (!(await isOwner())) return [];
  const admin = createAdminClient();

  // Auth list first so we can resolve the origin-owner id regardless
  // of what their profile.role currently says.
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailById = new Map<string, string | null>();
  const idByEmail = new Map<string, string>();
  for (const u of userList?.users ?? []) {
    const email = u.email ?? null;
    emailById.set(u.id, email);
    if (email) idByEmail.set(email.toLowerCase().trim(), u.id);
  }
  const originOwnerId = idByEmail.get(ORIGIN_OWNER_EMAIL) ?? null;

  const { data: owners } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "owner")
    .order("full_name", { ascending: true });
  const rows = (owners ?? []) as Array<{ id: string; full_name: string }>;

  // Fold in the origin owner even if their profile still says
  // "teacher" (migration 035 may not have run yet on this env).
  if (originOwnerId && !rows.some((r) => r.id === originOwnerId)) {
    const { data: originProfile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", originOwnerId)
      .maybeSingle();
    const op = originProfile as { id: string; full_name: string } | null;
    if (op) rows.unshift(op);
  }

  if (rows.length === 0) return [];

  // Most recent grant timestamp per owner.
  const ids = rows.map((r) => r.id);
  const { data: audit } = await admin
    .from("role_audit_log")
    .select("subject_id, new_role, created_at")
    .in("subject_id", ids)
    .eq("new_role", "owner")
    .order("created_at", { ascending: false });
  const grantedAt = new Map<string, string>();
  for (const a of (audit ?? []) as Array<{
    subject_id: string;
    created_at: string;
  }>) {
    if (!grantedAt.has(a.subject_id)) grantedAt.set(a.subject_id, a.created_at);
  }

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: emailById.get(r.id) ?? null,
    grantedAt: grantedAt.get(r.id) ?? null,
    isOrigin: originOwnerId === r.id,
  }));
}

export async function listRoleAuditLog(limit = 25): Promise<AuditRow[]> {
  if (!(await isOwner())) return [];
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("role_audit_log")
    .select(
      "id, actor_id, subject_id, previous_role, new_role, reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  const list = (rows ?? []) as Array<{
    id: string;
    actor_id: string | null;
    subject_id: string;
    previous_role: string;
    new_role: string;
    reason: string | null;
    created_at: string;
  }>;

  const ids = Array.from(
    new Set(
      list.flatMap((r) => [r.actor_id, r.subject_id].filter(Boolean) as string[]),
    ),
  );
  const { data: profiles } =
    ids.length > 0
      ? await admin.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) nameById.set(p.id, p.full_name);

  return list.map((r) => ({
    id: r.id,
    actorName: r.actor_id ? nameById.get(r.actor_id) ?? null : null,
    subjectName: nameById.get(r.subject_id) ?? null,
    previousRole: r.previous_role,
    newRole: r.new_role,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}
