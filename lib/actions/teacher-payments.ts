"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ManagementData, ManagementRow, StudentPaymentRow } from "@/lib/payments-types";
import { isTeacherRole } from "@/lib/auth/roles";

function firstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonthsDate(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/**
 * Same shape as the owner's getManagementMatrix but scoped to the signed-in
 * teacher's own roster. Auto-generates missing payment rows the same way.
 */
export async function getTeacherManagementMatrix(opts?: {
  months?: number;
}): Promise<ManagementData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Teacher access only" };
  }

  // Month range: fixed anchor at 2025-01, running through the first of
  // NEXT month (so if today is April, May is already visible). Returned
  // DESC (newest first) to match the existing ManagementData contract.
  // Whenever the teacher logs in, the current page load regenerates the
  // months array — missing a month never breaks anything, the next
  // visit just picks up every month up through current + 1.
  const now = new Date();
  const anchor = new Date(2025, 0, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1); // current + 1
  const ascMonths: string[] = [];
  {
    const cursor = new Date(anchor);
    while (cursor <= end) {
      ascMonths.push(firstOfMonth(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  const months = [...ascMonths].reverse(); // DESC: newest first
  void opts; // parameter kept for backward compat; anchor drives the range
  void addMonthsDate; // helper no longer needed here

  const { data: rosterRaw, error } = await admin
    .from("roster_students")
    .select(
      "id, full_name, teacher_id, auth_user_id, classroom_id, monthly_tuition_cents, billing_day, billing_starts_on, ended_on, created_at, classrooms(name)"
    )
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
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
    ended_on: string | null;
    created_at: string;
    classrooms: { name: string } | { name: string }[] | null;
  }>;

  const { data: teacherProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const teacherName =
    (teacherProfile as { full_name?: string } | null)?.full_name ?? "—";

  const rosterIds = roster.map((r) => r.id);
  let paymentRows: StudentPaymentRow[] = [];
  if (rosterIds.length > 0) {
    const { data: pays } = await admin
      .from("student_payments")
      .select("*")
      .in("roster_student_id", rosterIds)
      .gte("billing_month", months[months.length - 1]) // oldest
      .lte("billing_month", months[0])                 // newest
      .limit(50_000);
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
      teacher_name: teacherName,
      classroom_name: classroom?.name ?? null,
      has_auth: !!r.auth_user_id,
      monthly_tuition_cents: r.monthly_tuition_cents,
      billing_day: r.billing_day,
      billing_starts_on: r.billing_starts_on,
      ended_on: r.ended_on,
      roster_created_at: r.created_at,
      payments,
    };
  });

  return { months, rows };
}