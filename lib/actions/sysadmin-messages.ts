"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

// Mirrors the backstop in lib/auth/roles.ts — a user with this email is
// always treated as platform owner even if their profile row says otherwise.
const ORIGIN_OWNER_EMAIL = "leochalhoub@hotmail.com";

/**
 * Enumerate sysadmin user ids: anyone with role='owner' on profiles
 * UNION the backstop email's auth.users row. Deduped. Used to fan
 * review suggestions out to every sysadmin.
 */
async function collectSysadminIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const ids = new Set<string>();

  // Primary path: migration 071 ships a SECURITY DEFINER SQL function
  // that UNIONs owner-role profiles with the backstop-email auth user.
  // Single round-trip and works even when the profile row hasn't been
  // flipped to role='owner'.
  try {
    const { data, error } = await admin.rpc("get_all_sysadmin_ids");
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ user_id: string }>) {
        if (row.user_id) ids.add(row.user_id);
      }
    }
  } catch {
    /* fall through to manual lookup */
  }

  // Fallback: owner-role profiles directly (works even without the RPC).
  if (ids.size === 0) {
    const { data: roleRows } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "owner");
    for (const r of (roleRows ?? []) as Array<{ id: string }>) ids.add(r.id);
  }

  // Last resort: paginate auth users looking for the backstop email.
  // Capped at 20 pages × 200 = 4 000 users so a huge tenant can't
  // stall this request.
  if (ids.size === 0) {
    try {
      for (let page = 1; page <= 20; page += 1) {
        const { data } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        const users = data?.users ?? [];
        for (const u of users) {
          if ((u.email ?? "").toLowerCase().trim() === ORIGIN_OWNER_EMAIL) {
            ids.add(u.id);
          }
        }
        if (users.length < 200) break;
      }
    } catch {
      /* non-fatal */
    }
  }

  return Array.from(ids);
}
import type {
  SysadminMessageRow,
  SysadminMessageStatus,
} from "@/lib/actions/lesson-bank-types";

export interface SysadminMessageWithMeta extends SysadminMessageRow {
  sender_name: string | null;
  sender_email: string | null;
  recipient_name: string | null;
  bank_entry_title: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────────────────

/** Sysadmin opens a new review thread on a bank entry to a teacher. */
export async function sendReviewMessage(input: {
  recipient_id: string;
  bank_entry_id: string;
  body: string;
  subject?: string;
}): Promise<{ success: true; thread_id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const owner = await isOwner();
  if (!owner) return { error: "Forbidden" };
  if (!input.body.trim()) return { error: "Message body required." };

  const admin = createAdminClient();
  const threadId = randomUUID();

  const { error } = await admin.from("sysadmin_messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    sender_role: "owner",
    recipient_id: input.recipient_id,
    subject: input.subject ?? null,
    body: input.body.trim().slice(0, 4000),
    bank_entry_id: input.bank_entry_id,
    is_reply: false,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/teacher/profile");
  revalidatePath("/teacher/profile/messages");
  revalidatePath("/teacher/bank");
  return { success: true, thread_id: threadId };
}

/** Teacher OR sysadmin replies inside an existing thread. */
export async function replyInThread(input: {
  thread_id: string;
  body: string;
  new_status?: SysadminMessageStatus;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.body.trim()) return { error: "Message body required." };

  const admin = createAdminClient();

  // Pull the head message to infer recipient + bank entry + role.
  const { data: head } = await admin
    .from("sysadmin_messages")
    .select("*")
    .eq("thread_id", input.thread_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const h = head as SysadminMessageRow | null;
  if (!h) return { error: "Thread not found." };

  // Determine recipient = the OTHER party in the thread.
  const recipientId = h.sender_id === user.id ? h.recipient_id : h.sender_id;

  // Determine sender_role. If user is sysadmin, role='owner'; else 'teacher'.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profileRole = (profile as { role?: string } | null)?.role ?? "teacher";
  const senderRole =
    profileRole === "owner"
      ? "owner"
      : profileRole === "student"
        ? "student"
        : "teacher";

  const status: SysadminMessageStatus = input.new_status ?? "pending";

  const { error } = await admin.from("sysadmin_messages").insert({
    thread_id: input.thread_id,
    sender_id: user.id,
    sender_role: senderRole,
    recipient_id: recipientId,
    subject: null,
    body: input.body.trim().slice(0, 4000),
    bank_entry_id: h.bank_entry_id,
    is_reply: true,
    status,
  });
  if (error) return { error: error.message };

  // Propagate status across all messages in the thread for quick reads.
  if (input.new_status) {
    await admin
      .from("sysadmin_messages")
      .update({ status: input.new_status })
      .eq("thread_id", input.thread_id);
  }

  revalidatePath("/teacher/profile");
  revalidatePath("/teacher/profile/messages");
  revalidatePath("/teacher/bank");
  return { success: true };
}

/** Teacher marks a review as "OK, changes done" — thread flips to approved. */
export async function approveReviewThread(
  threadId: string,
): Promise<{ success: true } | { error: string }> {
  return replyInThread({
    thread_id: threadId,
    body: "✅ I've made the requested change.",
    new_status: "approved",
  });
}

/** Teacher disagrees — pushes status to rejected and sends a reply. */
export async function rejectReviewThread(input: {
  thread_id: string;
  body: string;
}): Promise<{ success: true } | { error: string }> {
  return replyInThread({
    thread_id: input.thread_id,
    body: input.body,
    new_status: "rejected",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

async function decorate(
  rows: SysadminMessageRow[],
): Promise<SysadminMessageWithMeta[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.sender_id, r.recipient_id])),
  );
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
    nameById.set(p.id, p.full_name ?? "");
  }
  const emailById = new Map<string, string>();
  for (const id of userIds) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(id);
      const email = u?.user?.email ?? null;
      if (email) emailById.set(id, email);
    } catch {
      /* ignore */
    }
  }
  const entryIds = Array.from(
    new Set(rows.map((r) => r.bank_entry_id).filter((x): x is string => !!x)),
  );
  const { data: entries } = await admin
    .from("lesson_bank_entries")
    .select("id, title")
    .in(
      "id",
      entryIds.length > 0 ? entryIds : ["00000000-0000-0000-0000-000000000000"],
    );
  const titleById = new Map<string, string>();
  for (const e of (entries ?? []) as Array<{ id: string; title: string }>) {
    titleById.set(e.id, e.title);
  }
  return rows.map((r) => ({
    ...r,
    sender_name: nameById.get(r.sender_id) ?? null,
    sender_email: emailById.get(r.sender_id) ?? null,
    recipient_name: nameById.get(r.recipient_id) ?? null,
    bank_entry_title: r.bank_entry_id ? titleById.get(r.bank_entry_id) ?? null : null,
  }));
}

/** Inbox = messages where I'm the recipient, newest first. */
export async function listMyInbox(opts?: {
  limit?: number;
}): Promise<SysadminMessageWithMeta[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("sysadmin_messages")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 5);
  return decorate((data as SysadminMessageRow[] | null) ?? []);
}

/** Full thread (ordered oldest → newest), for drill-in view. */
export async function getThread(
  threadId: string,
): Promise<SysadminMessageWithMeta[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("sysadmin_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  const rows = (data as SysadminMessageRow[] | null) ?? [];
  // Gate: user must be party to the thread (client would be blocked by RLS,
  // but we use service role for decoration, so enforce here).
  const isParty = rows.some(
    (r) => r.sender_id === user.id || r.recipient_id === user.id,
  );
  if (!isParty && !(await isOwner())) return [];
  return decorate(rows);
}

/** Full message list (paginated, newest first). */
export async function listMyMessages(opts?: {
  offset?: number;
  limit?: number;
}): Promise<SysadminMessageWithMeta[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 50;
  const { data } = await admin
    .from("sysadmin_messages")
    .select("*")
    .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return decorate((data as SysadminMessageRow[] | null) ?? []);
}

export async function markThreadRead(
  threadId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();
  await admin
    .from("sysadmin_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("recipient_id", user.id)
    .is("read_at", null);
  return { success: true };
}

export async function getUnreadInboxCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const admin = createAdminClient();
  const { count } = await admin
    .from("sysadmin_messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Teacher sends a "suggest update" for someone else's bank entry.
 * Goes to EVERY sysadmin (role='owner') as a pending review.
 */
export async function suggestBankEntryUpdate(input: {
  bank_entry_id: string;
  body: string;
}): Promise<{ success: true; sent_to: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.body.trim()) return { error: "Message body required." };
  const admin = createAdminClient();

  const { data: entry } = await admin
    .from("lesson_bank_entries")
    .select("id, title, author_id")
    .eq("id", input.bank_entry_id)
    .maybeSingle();
  if (!entry) return { error: "Bank entry not found." };

  const ids = await collectSysadminIds(admin);
  if (ids.length === 0) {
    return { error: "No sysadmins configured yet." };
  }

  const threadId = randomUUID();
  const payload = ids.map((recipientId) => ({
    thread_id: threadId,
    sender_id: user.id,
    sender_role: "teacher" as const,
    recipient_id: recipientId,
    subject: `Update request: ${(entry as { title: string }).title}`,
    body: input.body.trim().slice(0, 4000),
    bank_entry_id: input.bank_entry_id,
    is_reply: false,
    status: "pending" as const,
  }));

  const { error } = await admin.from("sysadmin_messages").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/teacher/bank");
  revalidatePath("/teacher/profile/messages");
  return { success: true, sent_to: ids.length };
}

/**
 * Sysadmin approves an update-request thread. We flip status to
 * 'approved' and notify the lesson author so they can apply the
 * change and re-share (which auto-propagates via shareLessonToBank).
 */
export async function approveSuggestedUpdate(
  threadId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const owner = await isOwner();
  if (!owner) return { error: "Forbidden" };
  const admin = createAdminClient();

  const { data: threadRows } = await admin
    .from("sysadmin_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  const rows = (threadRows ?? []) as SysadminMessageRow[];
  if (rows.length === 0) return { error: "Thread not found." };
  const head = rows[0];
  if (!head.bank_entry_id) return { error: "No bank entry on thread." };

  const { data: entry } = await admin
    .from("lesson_bank_entries")
    .select("id, author_id, title")
    .eq("id", head.bank_entry_id)
    .maybeSingle();
  if (!entry) return { error: "Bank entry missing." };
  const e = entry as { id: string; author_id: string; title: string };

  // Flip the thread to approved for tamper-evidence.
  await admin
    .from("sysadmin_messages")
    .update({ status: "approved" })
    .eq("thread_id", threadId);

  // Notify the lesson author with a new thread so they see it in their inbox.
  const notifyThread = randomUUID();
  await admin.from("sysadmin_messages").insert({
    thread_id: notifyThread,
    sender_id: user.id,
    sender_role: "owner",
    recipient_id: e.author_id,
    subject: `Approved suggestion for "${e.title}"`,
    body:
      `A sysadmin approved a community-submitted update suggestion for your lesson.\n\n` +
      `Original request:\n${head.body}\n\n` +
      `Please apply the change in your lesson editor and re-share to the bank — ` +
      `the new version will propagate to every teacher who migrated it.`,
    bank_entry_id: e.id,
    is_reply: false,
    status: "pending",
  });

  revalidatePath("/teacher/bank");
  revalidatePath("/teacher/profile/messages");
  return { success: true };
}

/** Sysadmin-only: pull every teacher email we can message. */
export async function sysadminListTeachers(): Promise<
  Array<{ id: string; full_name: string | null; email: string | null }>
> {
  const owner = await isOwner();
  if (!owner) return [];
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["teacher", "owner"]);
  const rows = (profiles ?? []) as Array<{
    id: string;
    full_name: string | null;
    role: string;
  }>;
  const out: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }> = [];
  for (const p of rows) {
    let email: string | null = null;
    try {
      const { data: u } = await admin.auth.admin.getUserById(p.id);
      email = u?.user?.email ?? null;
    } catch {
      /* ignore */
    }
    out.push({ id: p.id, full_name: p.full_name, email });
  }
  return out;
}
