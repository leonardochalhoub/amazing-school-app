"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

/**
 * Authorizes the caller as either the platform owner (full access) or the
 * specific teacher who owns the given roster student. Returns the user id on
 * success, or an error string.
 */
async function authorizeForStudent(
  rosterStudentId: string
): Promise<{ userId: string; isOwner: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const owner = await isOwner();
  if (owner) return { userId: user.id, isOwner: true };

  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("roster_students")
    .select("teacher_id")
    .eq("id", rosterStudentId)
    .maybeSingle();
  if (!roster) return { error: "Student not found" };
  if ((roster as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "You don't own this student" };
  }
  return { userId: user.id, isOwner: false };
}

export interface StudentPaymentRow {
  id: string;
  roster_student_id: string;
  teacher_id: string;
  billing_month: string;
  amount_cents: number | null;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementRow {
  roster_student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  classroom_name: string | null;
  has_auth: boolean;
  monthly_tuition_cents: number | null;
  billing_day: number | null;
  billing_starts_on: string | null;
  payments: Record<string, StudentPaymentRow | null>;
}

export interface ManagementData {
  months: string[]; // newest first (YYYY-MM-01)
  rows: ManagementRow[];
}

function firstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonthsDate(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/**
 * Auto-creates the student_payments rows that SHOULD exist given every
 * active student's tuition config. Called at the top of the Management
 * view so the grid always reflects reality.
 */
async function ensurePaymentRows(months: string[]) {
  const admin = createAdminClient();
  const { data: active } = await admin
    .from("roster_students")
    .select(
      "id, teacher_id, monthly_tuition_cents, billing_day, billing_starts_on, created_at"
    )
    .not("monthly_tuition_cents", "is", null);
  const list = (active ?? []) as Array<{
    id: string;
    teacher_id: string;
    monthly_tuition_cents: number;
    billing_day: number | null;
    billing_starts_on: string | null;
    created_at: string;
  }>;
  if (list.length === 0) return;

  const rosterIds = list.map((r) => r.id);
  const earliest = months[months.length - 1];
  const latest = months[0];
  const { data: existing } = await admin
    .from("student_payments")
    .select("roster_student_id, billing_month")
    .in("roster_student_id", rosterIds)
    .gte("billing_month", earliest)
    .lte("billing_month", latest);
  const have = new Set<string>();
  for (const e of (existing ?? []) as Array<{
    roster_student_id: string;
    billing_month: string;
  }>) {
    have.add(`${e.roster_student_id}|${e.billing_month.slice(0, 10)}`);
  }

  const rowsToInsert: Array<{
    roster_student_id: string;
    teacher_id: string;
    billing_month: string;
    amount_cents: number;
    paid: boolean;
  }> = [];
  for (const r of list) {
    const startIso =
      r.billing_starts_on ?? firstOfMonth(new Date(r.created_at));
    for (const m of months) {
      if (m < startIso.slice(0, 10)) continue;
      const key = `${r.id}|${m}`;
      if (have.has(key)) continue;
      rowsToInsert.push({
        roster_student_id: r.id,
        teacher_id: r.teacher_id,
        billing_month: m,
        amount_cents: r.monthly_tuition_cents,
        paid: false,
      });
    }
  }
  if (rowsToInsert.length > 0) {
    await admin.from("student_payments").insert(rowsToInsert);
  }
}

export async function getManagementMatrix(opts?: {
  months?: number;
}): Promise<ManagementData | { error: string }> {
  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const now = new Date();
  const count = opts?.months ?? 24;
  const months = Array.from({ length: count }, (_, i) =>
    firstOfMonth(addMonthsDate(now, -i))
  );

  await ensurePaymentRows(months);

  const { data: rosterRaw, error } = await admin
    .from("roster_students")
    .select(
      "id, full_name, teacher_id, auth_user_id, classroom_id, monthly_tuition_cents, billing_day, billing_starts_on, classrooms(name)"
    )
    .order("full_name", { ascending: true });
  if (error) return { error: error.message };

  const roster = (rosterRaw ?? []) as Array<{
    id: string;
    full_name: string;
    teacher_id: string;
    auth_user_id: string | null;
    classroom_id: string | null;
    monthly_tuition_cents: number | null;
    billing_day: number | null;
    billing_starts_on: string | null;
    classrooms: { name: string } | { name: string }[] | null;
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
  let paymentRows: StudentPaymentRow[] = [];
  if (rosterIds.length > 0) {
    const { data: pays } = await admin
      .from("student_payments")
      .select("*")
      .in("roster_student_id", rosterIds)
      .gte("billing_month", months[months.length - 1])
      .lte("billing_month", months[0]);
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
      classroom_name: classroom?.name ?? null,
      has_auth: !!r.auth_user_id,
      monthly_tuition_cents: r.monthly_tuition_cents,
      billing_day: r.billing_day,
      billing_starts_on: r.billing_starts_on,
      payments,
    };
  });

  return { months, rows };
}

const TogglePaidSchema = z.object({
  rosterStudentId: z.string().uuid(),
  billingMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  paid: z.boolean(),
});

export async function togglePaymentPaid(input: z.input<typeof TogglePaidSchema>) {
  const parsed = TogglePaidSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const auth = await authorizeForStudent(parsed.data.rosterStudentId);
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { data: roster, error: rErr } = await admin
    .from("roster_students")
    .select("teacher_id, monthly_tuition_cents")
    .eq("id", parsed.data.rosterStudentId)
    .maybeSingle();
  if (rErr || !roster) return { error: "Student not found" };
  const r = roster as { teacher_id: string; monthly_tuition_cents: number | null };

  const row = {
    roster_student_id: parsed.data.rosterStudentId,
    teacher_id: r.teacher_id,
    billing_month: parsed.data.billingMonth,
    paid: parsed.data.paid,
    paid_at: parsed.data.paid ? new Date().toISOString() : null,
    amount_cents: r.monthly_tuition_cents ?? null,
  };
  const { error } = await admin
    .from("student_payments")
    .upsert(row, { onConflict: "roster_student_id,billing_month" });
  if (error) return { error: error.message };

  revalidatePath("/owner/management");
  revalidatePath("/teacher/finance");
  return { success: true as const };
}

const SetTuitionSchema = z.object({
  rosterStudentId: z.string().uuid(),
  monthlyAmountCents: z.number().int().min(0).max(10_000_000).nullable(),
  billingDay: z.number().int().min(1).max(28).nullable(),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

/**
 * Writes the fixed monthly tuition config. When amount OR day is set and
 * the student has no billing_starts_on yet, defaults it to the first of
 * the current month so auto-generation has an anchor.
 */
export async function setStudentTuition(input: z.input<typeof SetTuitionSchema>) {
  const parsed = SetTuitionSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const auth = await authorizeForStudent(parsed.data.rosterStudentId);
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("roster_students")
    .select("billing_starts_on")
    .eq("id", parsed.data.rosterStudentId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    monthly_tuition_cents: parsed.data.monthlyAmountCents,
    billing_day: parsed.data.billingDay,
  };
  if (parsed.data.startsOn !== null) {
    patch.billing_starts_on = parsed.data.startsOn;
  } else if (!current?.billing_starts_on && parsed.data.monthlyAmountCents) {
    const now = new Date();
    patch.billing_starts_on = firstOfMonth(now);
  }

  const { error } = await admin
    .from("roster_students")
    .update(patch)
    .eq("id", parsed.data.rosterStudentId);
  if (error) return { error: error.message };

  revalidatePath("/owner/management");
  revalidatePath("/teacher/finance");
  return { success: true as const };
}
