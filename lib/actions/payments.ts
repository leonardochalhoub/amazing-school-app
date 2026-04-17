"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

export interface StudentPaymentRow {
  id: string;
  roster_student_id: string;
  teacher_id: string;
  billing_month: string; // YYYY-MM-01
  amount_cents: number | null;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function firstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return firstOfMonth(d);
}

export async function listMonths(count = 12): Promise<string[]> {
  const now = new Date();
  // Current month + 11 previous — newest first.
  return Array.from({ length: count }, (_, i) => firstOfMonth(addMonthsDate(now, -i)));
}

function addMonthsDate(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

interface ManagementRow {
  roster_student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  has_auth: boolean;
  classroom_name: string | null;
  payments: Record<string, StudentPaymentRow | null>;
}

/**
 * OWNER ONLY — returns every student across every teacher, plus a per-month
 * matrix of payment rows so the CRM can render a grid.
 */
export async function getManagementMatrix(opts?: {
  months?: number;
}): Promise<{ months: string[]; rows: ManagementRow[] } | { error: string }> {
  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const months = await listMonths(opts?.months ?? 12);

  // All roster students + their teacher + classroom.
  const { data: rosterRaw, error } = await admin
    .from("roster_students")
    .select(
      "id, full_name, teacher_id, auth_user_id, classroom_id, classrooms(name)"
    )
    .order("full_name", { ascending: true });
  if (error) return { error: error.message };

  const roster = (rosterRaw ?? []) as Array<{
    id: string;
    full_name: string;
    teacher_id: string;
    auth_user_id: string | null;
    classroom_id: string | null;
    classrooms:
      | { name: string }
      | { name: string }[]
      | null;
  }>;

  const teacherIds = [...new Set(roster.map((r) => r.teacher_id))];
  const { data: teachers } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", teacherIds);
  const teacherMap = new Map<string, string>(
    (teachers ?? []).map((t) => [t.id as string, t.full_name as string])
  );

  const rosterIds = roster.map((r) => r.id);
  const earliest = months[months.length - 1];
  const latest = months[0];

  let paymentRows: StudentPaymentRow[] = [];
  if (rosterIds.length > 0) {
    const { data: pays } = await admin
      .from("student_payments")
      .select("*")
      .in("roster_student_id", rosterIds)
      .gte("billing_month", earliest)
      .lte("billing_month", latest);
    paymentRows = (pays ?? []) as StudentPaymentRow[];
  }
  const paymentIndex = new Map<string, StudentPaymentRow>();
  for (const p of paymentRows) {
    paymentIndex.set(`${p.roster_student_id}|${p.billing_month.slice(0, 10)}`, p);
  }

  const rows: ManagementRow[] = roster.map((r) => {
    const classroom = Array.isArray(r.classrooms) ? r.classrooms[0] : r.classrooms;
    const payments: Record<string, StudentPaymentRow | null> = {};
    for (const m of months) {
      payments[m] = paymentIndex.get(`${r.id}|${m}`) ?? null;
    }
    return {
      roster_student_id: r.id,
      student_name: r.full_name,
      teacher_id: r.teacher_id,
      teacher_name: teacherMap.get(r.teacher_id) ?? "—",
      has_auth: !!r.auth_user_id,
      classroom_name: classroom?.name ?? null,
      payments,
    };
  });

  return { months, rows };
}

const TogglePaidSchema = z.object({
  rosterStudentId: z.string().uuid(),
  billingMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  paid: z.boolean(),
  amountCents: z.number().int().min(0).max(1_000_000).optional(),
});

/**
 * Owner flips paid/unpaid for a (student, month). Auto-creates the row when
 * missing so the grid can start from zero.
 */
export async function togglePaymentPaid(input: z.input<typeof TogglePaidSchema>) {
  const parsed = TogglePaidSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const { data: roster, error: rErr } = await admin
    .from("roster_students")
    .select("teacher_id")
    .eq("id", parsed.data.rosterStudentId)
    .maybeSingle();
  if (rErr || !roster)
    return { error: "Student not found" };

  const row = {
    roster_student_id: parsed.data.rosterStudentId,
    teacher_id: (roster as { teacher_id: string }).teacher_id,
    billing_month: parsed.data.billingMonth,
    paid: parsed.data.paid,
    paid_at: parsed.data.paid ? new Date().toISOString() : null,
    amount_cents: parsed.data.amountCents ?? null,
  };
  const { error } = await admin
    .from("student_payments")
    .upsert(row, { onConflict: "roster_student_id,billing_month" });
  if (error) return { error: error.message };

  revalidatePath("/owner/management");
  return { success: true as const };
}

const SetAmountSchema = z.object({
  rosterStudentId: z.string().uuid(),
  billingMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  amountCents: z.number().int().min(0).max(1_000_000),
});

export async function setPaymentAmount(input: z.input<typeof SetAmountSchema>) {
  const parsed = SetAmountSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("roster_students")
    .select("teacher_id")
    .eq("id", parsed.data.rosterStudentId)
    .maybeSingle();
  if (!roster) return { error: "Student not found" };

  const row = {
    roster_student_id: parsed.data.rosterStudentId,
    teacher_id: (roster as { teacher_id: string }).teacher_id,
    billing_month: parsed.data.billingMonth,
    amount_cents: parsed.data.amountCents,
  };
  const { error } = await admin
    .from("student_payments")
    .upsert(row, { onConflict: "roster_student_id,billing_month" });
  if (error) return { error: error.message };

  revalidatePath("/owner/management");
  return { success: true as const };
}

/**
 * Rolls every active roster student into a brand-new month: creates a
 * student_payments row (paid=false) for each roster entry that doesn't
 * already have one for that month. Carries forward the most recent amount.
 */
export async function generateMonth(input: { billingMonth: string }) {
  const month = input.billingMonth;
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { error: "Invalid month" };

  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("roster_students")
    .select("id, teacher_id");
  const list = (roster ?? []) as Array<{ id: string; teacher_id: string }>;
  if (list.length === 0) return { success: true as const, created: 0 };

  const { data: existing } = await admin
    .from("student_payments")
    .select("roster_student_id")
    .eq("billing_month", month);
  const haveRows = new Set(
    (existing ?? []).map((x: { roster_student_id: string }) => x.roster_student_id)
  );

  // Pull the most recent amount per student so we can carry it forward.
  const { data: recent } = await admin
    .from("student_payments")
    .select("roster_student_id, amount_cents, billing_month")
    .order("billing_month", { ascending: false });
  const amountByRoster = new Map<string, number | null>();
  for (const r of (recent ?? []) as Array<{
    roster_student_id: string;
    amount_cents: number | null;
  }>) {
    if (!amountByRoster.has(r.roster_student_id)) {
      amountByRoster.set(r.roster_student_id, r.amount_cents);
    }
  }

  const newRows = list
    .filter((r) => !haveRows.has(r.id))
    .map((r) => ({
      roster_student_id: r.id,
      teacher_id: r.teacher_id,
      billing_month: month,
      amount_cents: amountByRoster.get(r.id) ?? null,
      paid: false,
    }));
  if (newRows.length === 0) return { success: true as const, created: 0 };

  const { error } = await admin.from("student_payments").insert(newRows);
  if (error) return { error: error.message };
  revalidatePath("/owner/management");
  return { success: true as const, created: newRows.length };
}
