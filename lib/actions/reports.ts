"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";
import { isOwner } from "@/lib/auth/roles";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { yearBounds, type Year } from "@/lib/reports/period";
import type { StudentPaymentRow } from "@/lib/payments-types";

/**
 * All report data-fetchers live here so routes under /print stay
 * dumb and declarative. Each function authorizes first (teacher /
 * owner), then returns a plain-JSON payload ready for a server
 * component to map into markup.
 */

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

interface TeacherBrand {
  id: string;
  fullName: string | null;
  email: string | null;
  schoolLogoEnabled: boolean;
  schoolLogoUrl: string | null;
}

async function loadTeacherBrand(
  admin: ReturnType<typeof createAdminClient>,
  teacherId: string,
): Promise<TeacherBrand> {
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, school_logo_enabled, school_logo_url")
    .eq("id", teacherId)
    .maybeSingle();
  return {
    id: teacherId,
    fullName: (data as { full_name?: string } | null)?.full_name ?? null,
    email: (data as { email?: string } | null)?.email ?? null,
    schoolLogoEnabled:
      (data as { school_logo_enabled?: boolean } | null)?.school_logo_enabled ??
      false,
    schoolLogoUrl:
      (data as { school_logo_url?: string } | null)?.school_logo_url ?? null,
  };
}

function withinYear(iso: string | null | undefined, year: Year): boolean {
  if (!iso) return false;
  if (year === "all") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year;
}

// -----------------------------------------------------------------------------
// Student curriculum report
// -----------------------------------------------------------------------------

export interface CurriculumEntry {
  slug: string;
  kind: "lesson" | "music";
  title: string;
  cefr: string | null;
  category: string | null;
  status: "assigned" | "skipped" | "completed";
  assignedAt: string | null;
  completedAt: string | null;
  xpEarned: number | null;
}

export interface CurriculumReportData {
  teacher: TeacherBrand;
  student: {
    id: string;
    fullName: string;
    preferredName: string | null;
    level: string | null;
    classroomName: string | null;
    billingStartsOn: string | null;
    endedOn: string | null;
    authUserId: string | null;
  };
  year: Year;
  availableYears: number[];
  entries: CurriculumEntry[];
  stats: {
    totalAssigned: number;
    totalCompleted: number;
    totalXp: number;
    byCefr: Array<{ cefr: string; assigned: number; completed: number }>;
    byMonth: Array<{ month: string; lessons: number; music: number }>;
  };
  generatedAt: string;
}

export async function getStudentCurriculumReport(
  rosterStudentId: string,
  year: Year,
): Promise<CurriculumReportData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }

  const { data: rosterRaw, error } = await admin
    .from("roster_students")
    .select(
      "id, teacher_id, full_name, preferred_name, auth_user_id, classroom_id, level, billing_starts_on, ended_on, created_at, classrooms(name)",
    )
    .eq("id", rosterStudentId)
    .maybeSingle();
  if (error || !rosterRaw) return { error: "Aluno não encontrado" };
  const roster = rosterRaw as {
    id: string;
    teacher_id: string;
    full_name: string;
    preferred_name: string | null;
    auth_user_id: string | null;
    classroom_id: string | null;
    level: string | null;
    billing_starts_on: string | null;
    ended_on: string | null;
    created_at: string;
    classrooms: { name: string } | { name: string }[] | null;
  };
  if (roster.teacher_id !== user.id) {
    return { error: "Aluno não pertence a este professor" };
  }

  const teacher = await loadTeacherBrand(admin, roster.teacher_id);

  // Pull every assignment for this roster row — classroom-wide ones
  // attached via classroom_id plus per-student ones with roster_id set.
  // Soft-deleted classrooms still surface so archived assignments show
  // up on the curriculum.
  const orClauses: string[] = [`roster_student_id.eq.${rosterStudentId}`];
  if (roster.classroom_id) orClauses.push(`classroom_id.eq.${roster.classroom_id}`);
  const { data: assignments } = await admin
    .from("lesson_assignments")
    .select(
      "id, classroom_id, roster_student_id, student_id, lesson_slug, status, assigned_at",
    )
    .or(orClauses.join(","))
    .order("assigned_at", { ascending: true });

  // Completion timestamps — pulled from lesson_progress for the
  // linked auth user (if any). Students without an auth_user_id have
  // no progress yet so this falls back gracefully.
  const progressByslug = new Map<string, { completedAt: string; xp: number }>();
  if (roster.auth_user_id) {
    const { data: prog } = await admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at, xp_earned")
      .eq("student_id", roster.auth_user_id)
      .not("completed_at", "is", null)
      .limit(10_000);
    for (const p of (prog ?? []) as Array<{
      lesson_slug: string;
      completed_at: string;
      xp_earned: number | null;
    }>) {
      const existing = progressByslug.get(p.lesson_slug);
      if (!existing || existing.completedAt < p.completed_at) {
        progressByslug.set(p.lesson_slug, {
          completedAt: p.completed_at,
          xp: p.xp_earned ?? 0,
        });
      }
    }
  }

  const rawEntries: CurriculumEntry[] = (assignments ?? []).map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lesson_slug as string);
    const prog = progressByslug.get(a.lesson_slug as string);
    if (kind === "music") {
      const m = getMusic(slug);
      return {
        slug,
        kind: "music" as const,
        title: m ? `${m.artist} — ${m.title}` : slug,
        cefr: m?.cefr_level ?? null,
        category: "music",
        status: a.status as "assigned" | "skipped" | "completed",
        assignedAt: a.assigned_at as string,
        completedAt: prog?.completedAt ?? null,
        xpEarned: prog?.xp ?? null,
      };
    }
    const meta = findLessonMeta(slug);
    return {
      slug,
      kind: "lesson" as const,
      title: meta?.title ?? slug,
      cefr: meta?.cefr_level ?? null,
      category: meta?.category ?? null,
      status: a.status as "assigned" | "skipped" | "completed",
      assignedAt: a.assigned_at as string,
      completedAt: prog?.completedAt ?? null,
      xpEarned: prog?.xp ?? null,
    };
  });

  // Filter to the selected year. An entry counts if EITHER it was
  // assigned OR completed inside the window — this keeps lessons that
  // were assigned late last year but finished this year visible on the
  // current year's curriculum.
  const entries = rawEntries.filter(
    (e) => withinYear(e.assignedAt, year) || withinYear(e.completedAt, year),
  );

  // Stats
  let totalXp = 0;
  const byCefrMap = new Map<string, { assigned: number; completed: number }>();
  const byMonthMap = new Map<string, { lessons: number; music: number }>();
  for (const e of entries) {
    const cefr = (e.cefr ?? "—").toUpperCase();
    const slot = byCefrMap.get(cefr) ?? { assigned: 0, completed: 0 };
    slot.assigned += 1;
    if (e.status === "completed") {
      slot.completed += 1;
      totalXp += e.xpEarned ?? 0;
      if (e.completedAt) {
        const m = e.completedAt.slice(0, 7);
        const bucket = byMonthMap.get(m) ?? { lessons: 0, music: 0 };
        if (e.kind === "music") bucket.music += 1;
        else bucket.lessons += 1;
        byMonthMap.set(m, bucket);
      }
    }
    byCefrMap.set(cefr, slot);
  }

  const years = new Set<number>();
  for (const e of rawEntries) {
    if (e.assignedAt) years.add(new Date(e.assignedAt).getFullYear());
    if (e.completedAt) years.add(new Date(e.completedAt).getFullYear());
  }
  years.add(new Date().getFullYear());
  const availableYears = Array.from(years)
    .filter((y) => y >= 2020 && y <= new Date().getFullYear() + 1)
    .sort((a, b) => a - b);

  const classroom = Array.isArray(roster.classrooms)
    ? roster.classrooms[0]
    : roster.classrooms;

  return {
    teacher,
    student: {
      id: roster.id,
      fullName: roster.full_name,
      preferredName: roster.preferred_name,
      level: roster.level,
      classroomName: classroom?.name ?? null,
      billingStartsOn: roster.billing_starts_on,
      endedOn: roster.ended_on,
      authUserId: roster.auth_user_id,
    },
    year,
    availableYears,
    entries: entries.sort((a, b) =>
      (a.assignedAt ?? "").localeCompare(b.assignedAt ?? ""),
    ),
    stats: {
      totalAssigned: entries.length,
      totalCompleted: entries.filter((e) => e.status === "completed").length,
      totalXp,
      byCefr: Array.from(byCefrMap.entries())
        .map(([cefr, v]) => ({ cefr, ...v }))
        .sort((a, b) => a.cefr.localeCompare(b.cefr)),
      byMonth: Array.from(byMonthMap.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    },
    generatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Teacher cohort report
// -----------------------------------------------------------------------------

export interface CohortStudentRow {
  id: string;
  fullName: string;
  classroomName: string | null;
  level: string | null;
  totalXp: number;
  lessonsCompleted: number;
  lessonsAssigned: number;
  streak: number;
  lastActivity: string | null;
}

export interface CohortReportData {
  teacher: TeacherBrand;
  year: Year;
  classrooms: Array<{
    id: string;
    name: string;
    studentCount: number;
    inviteCode: string;
  }>;
  students: CohortStudentRow[];
  totals: {
    students: number;
    classrooms: number;
    totalXp: number;
    lessonsAssigned: number;
    lessonsCompleted: number;
  };
  generatedAt: string;
}

export async function getCohortReport(
  year: Year,
): Promise<CohortReportData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }

  const teacher = await loadTeacherBrand(admin, user.id);

  const { data: classroomsRaw } = await admin
    .from("classrooms")
    .select("id, name, invite_code")
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  const classroomList = (classroomsRaw ?? []) as Array<{
    id: string;
    name: string;
    invite_code: string;
  }>;
  const classroomIds = classroomList.map((c) => c.id);

  const { data: rosterRaw } = await admin
    .from("roster_students")
    .select("id, full_name, auth_user_id, classroom_id, level, classrooms(name)")
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  const roster = (rosterRaw ?? []) as Array<{
    id: string;
    full_name: string;
    auth_user_id: string | null;
    classroom_id: string | null;
    level: string | null;
    classrooms: { name: string } | { name: string }[] | null;
  }>;

  const studentAuthIds = roster
    .map((r) => r.auth_user_id)
    .filter((x): x is string => !!x);

  // Assignments + completions filtered by year bounds.
  const { from, to } = yearBounds(year);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [assignmentsRes, progressRes, xpRes] = await Promise.all([
    classroomIds.length > 0
      ? admin
          .from("lesson_assignments")
          .select("id, classroom_id, roster_student_id, student_id, status, assigned_at")
          .in("classroom_id", classroomIds.concat([])) // Type coercion; classrooms.length>0 enforced
          .gte("assigned_at", fromIso)
          .lt("assigned_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
    studentAuthIds.length > 0
      ? admin
          .from("lesson_progress")
          .select("student_id, completed_at, xp_earned")
          .in("student_id", studentAuthIds)
          .not("completed_at", "is", null)
          .gte("completed_at", fromIso)
          .lt("completed_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
    studentAuthIds.length > 0
      ? admin
          .from("xp_events")
          .select("student_id, amount, created_at")
          .in("student_id", studentAuthIds)
          .gte("created_at", fromIso)
          .lt("created_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
  ]);

  const assignmentsByRoster = new Map<string, number>();
  for (const a of (assignmentsRes.data ?? []) as Array<{
    roster_student_id: string | null;
    classroom_id: string | null;
  }>) {
    // Classroom-wide → attribute to every roster student in that room
    if (a.roster_student_id) {
      assignmentsByRoster.set(
        a.roster_student_id,
        (assignmentsByRoster.get(a.roster_student_id) ?? 0) + 1,
      );
    } else if (a.classroom_id) {
      for (const r of roster.filter((x) => x.classroom_id === a.classroom_id)) {
        assignmentsByRoster.set(r.id, (assignmentsByRoster.get(r.id) ?? 0) + 1);
      }
    }
  }

  const completedByAuth = new Map<string, number>();
  const lastActivityByAuth = new Map<string, string>();
  for (const p of (progressRes.data ?? []) as Array<{
    student_id: string;
    completed_at: string;
  }>) {
    completedByAuth.set(p.student_id, (completedByAuth.get(p.student_id) ?? 0) + 1);
    const prev = lastActivityByAuth.get(p.student_id);
    if (!prev || prev < p.completed_at) {
      lastActivityByAuth.set(p.student_id, p.completed_at);
    }
  }

  const xpByAuth = new Map<string, number>();
  for (const ev of (xpRes.data ?? []) as Array<{
    student_id: string;
    amount: number;
  }>) {
    xpByAuth.set(ev.student_id, (xpByAuth.get(ev.student_id) ?? 0) + (ev.amount ?? 0));
  }

  const studentRows: CohortStudentRow[] = roster.map((r) => {
    const classroom = Array.isArray(r.classrooms) ? r.classrooms[0] : r.classrooms;
    const authId = r.auth_user_id;
    return {
      id: r.id,
      fullName: r.full_name,
      classroomName: classroom?.name ?? null,
      level: r.level,
      totalXp: authId ? xpByAuth.get(authId) ?? 0 : 0,
      lessonsCompleted: authId ? completedByAuth.get(authId) ?? 0 : 0,
      lessonsAssigned: assignmentsByRoster.get(r.id) ?? 0,
      streak: 0, // streak is out-of-period; omitted for yearly report
      lastActivity: authId ? lastActivityByAuth.get(authId) ?? null : null,
    };
  });
  studentRows.sort((a, b) => b.totalXp - a.totalXp);

  const classroomSummaries = classroomList.map((c) => ({
    id: c.id,
    name: c.name,
    inviteCode: c.invite_code,
    studentCount: roster.filter((r) => r.classroom_id === c.id).length,
  }));

  return {
    teacher,
    year,
    classrooms: classroomSummaries,
    students: studentRows,
    totals: {
      students: roster.length,
      classrooms: classroomList.length,
      totalXp: studentRows.reduce((s, r) => s + r.totalXp, 0),
      lessonsAssigned: studentRows.reduce((s, r) => s + r.lessonsAssigned, 0),
      lessonsCompleted: studentRows.reduce((s, r) => s + r.lessonsCompleted, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Teacher financial report
// -----------------------------------------------------------------------------

export interface FinanceReportRow {
  rosterStudentId: string;
  studentName: string;
  classroomName: string | null;
  monthlyTuitionCents: number | null;
  months: Array<{
    month: string; // YYYY-MM-01
    state: "none" | "due" | "paid";
    amountCents: number | null;
    paidAt: string | null;
  }>;
  paidCents: number;
  pendingCents: number;
}

export interface FinanceReportData {
  teacher: TeacherBrand;
  year: number;
  months: string[]; // asc within the year
  rows: FinanceReportRow[];
  totals: {
    paidCents: number;
    pendingCents: number;
    invoicesPaid: number;
    invoicesPending: number;
    activeSeats: number;
  };
  generatedAt: string;
}

export async function getFinanceReport(
  year: number,
): Promise<FinanceReportData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }

  const teacher = await loadTeacherBrand(admin, user.id);

  const months: string[] = [];
  for (let m = 0; m < 12; m++) {
    const mm = String(m + 1).padStart(2, "0");
    months.push(`${year}-${mm}-01`);
  }

  const { data: rosterRaw } = await admin
    .from("roster_students")
    .select(
      "id, full_name, classroom_id, monthly_tuition_cents, billing_starts_on, ended_on, created_at, classrooms(name)",
    )
    .eq("teacher_id", user.id)
    .order("full_name", { ascending: true });
  const roster = (rosterRaw ?? []) as Array<{
    id: string;
    full_name: string;
    classroom_id: string | null;
    monthly_tuition_cents: number | null;
    billing_starts_on: string | null;
    ended_on: string | null;
    created_at: string;
    classrooms: { name: string } | { name: string }[] | null;
  }>;

  const rosterIds = roster.map((r) => r.id);
  let payments: StudentPaymentRow[] = [];
  if (rosterIds.length > 0) {
    const { data: pays } = await admin
      .from("student_payments")
      .select("*")
      .in("roster_student_id", rosterIds)
      .gte("billing_month", `${year}-01-01`)
      .lt("billing_month", `${year + 1}-01-01`)
      .limit(50_000);
    payments = (pays ?? []) as StudentPaymentRow[];
  }

  const byKey = new Map<string, StudentPaymentRow>();
  for (const p of payments) {
    byKey.set(`${p.roster_student_id}|${p.billing_month.slice(0, 10)}`, p);
  }

  let paidCents = 0;
  let pendingCents = 0;
  let invoicesPaid = 0;
  let invoicesPending = 0;

  const rows: FinanceReportRow[] = roster.map((r) => {
    const classroom = Array.isArray(r.classrooms) ? r.classrooms[0] : r.classrooms;
    let rowPaid = 0;
    let rowPending = 0;
    const mappedMonths = months.map((m) => {
      const p = byKey.get(`${r.id}|${m}`) ?? null;
      const amt = p?.amount_cents ?? r.monthly_tuition_cents ?? null;
      let state: "none" | "due" | "paid" = "none";
      if (p?.paid) state = "paid";
      else if (p?.due_marked_at) state = "due";

      // Gate by the student's active window so months before they
      // started or after they ended don't show phantom "pending"
      // amounts on the report.
      const active = (() => {
        const startISO = r.billing_starts_on ?? r.created_at;
        const startMonth = startISO ? startISO.slice(0, 7) + "-01" : null;
        const endMonth = r.ended_on ? r.ended_on.slice(0, 7) + "-01" : null;
        if (startMonth && m < startMonth) return false;
        if (endMonth && m > endMonth) return false;
        return true;
      })();

      if (!active) {
        return {
          month: m,
          state: "none" as const,
          amountCents: null,
          paidAt: null,
        };
      }

      if (state === "paid") {
        rowPaid += amt ?? 0;
        invoicesPaid += 1;
        paidCents += amt ?? 0;
      } else if (amt && amt > 0) {
        rowPending += amt;
        invoicesPending += 1;
        pendingCents += amt;
      }

      return {
        month: m,
        state,
        amountCents: amt,
        paidAt: p?.paid_at ?? null,
      };
    });

    return {
      rosterStudentId: r.id,
      studentName: r.full_name,
      classroomName: classroom?.name ?? null,
      monthlyTuitionCents: r.monthly_tuition_cents,
      months: mappedMonths,
      paidCents: rowPaid,
      pendingCents: rowPending,
    };
  });

  return {
    teacher,
    year,
    months,
    rows,
    totals: {
      paidCents,
      pendingCents,
      invoicesPaid,
      invoicesPending,
      activeSeats: roster.filter(
        (r) => (r.monthly_tuition_cents ?? 0) > 0 && !r.ended_on,
      ).length,
    },
    generatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Receipt (recibo) for a single paid invoice
// -----------------------------------------------------------------------------

export interface ReceiptData {
  teacher: TeacherBrand;
  student: {
    id: string;
    fullName: string;
    email: string | null;
    classroomName: string | null;
  };
  payment: {
    id: string;
    billingMonth: string; // YYYY-MM-01
    amountCents: number;
    currency: string;
    paid: boolean;
    paidAt: string | null;
    notes: string | null;
  };
  receiptNumber: string;
  generatedAt: string;
}

export async function getReceiptData(
  paymentId: string,
): Promise<ReceiptData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }

  const { data: paymentRaw } = await admin
    .from("student_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!paymentRaw) return { error: "Pagamento não encontrado" };
  const payment = paymentRaw as StudentPaymentRow;
  if (payment.teacher_id !== user.id) {
    return { error: "Sem permissão sobre este pagamento" };
  }
  if (!payment.paid) {
    return {
      error:
        "Recibo disponível apenas para pagamentos confirmados (marque como pago primeiro).",
    };
  }

  const { data: rosterRaw } = await admin
    .from("roster_students")
    .select(
      "id, full_name, email, classroom_id, monthly_tuition_cents, classrooms(name)",
    )
    .eq("id", payment.roster_student_id)
    .maybeSingle();
  if (!rosterRaw) return { error: "Aluno não encontrado" };
  const roster = rosterRaw as {
    id: string;
    full_name: string;
    email: string | null;
    classroom_id: string | null;
    monthly_tuition_cents: number | null;
    classrooms: { name: string } | { name: string }[] | null;
  };

  const teacher = await loadTeacherBrand(admin, payment.teacher_id);
  const classroom = Array.isArray(roster.classrooms)
    ? roster.classrooms[0]
    : roster.classrooms;

  // Deterministic receipt number: AS-YYYYMM-<first 6 of uuid>
  const month = payment.billing_month.slice(0, 7).replace("-", "");
  const suffix = payment.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const receiptNumber = `AS-${month}-${suffix}`;

  return {
    teacher,
    student: {
      id: roster.id,
      fullName: roster.full_name,
      email: roster.email,
      classroomName: classroom?.name ?? null,
    },
    payment: {
      id: payment.id,
      billingMonth: payment.billing_month.slice(0, 10),
      amountCents: payment.amount_cents ?? roster.monthly_tuition_cents ?? 0,
      currency: payment.currency,
      paid: payment.paid,
      paidAt: payment.paid_at,
      notes: payment.notes,
    },
    receiptNumber,
    generatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// List paid invoices for a single student — used to render the
// "Recibos" sub-section on the per-student teacher page, where each
// row is a printable receipt link.
// -----------------------------------------------------------------------------

export interface PaidInvoiceRow {
  paymentId: string;
  billingMonth: string; // YYYY-MM-01
  amountCents: number;
  paidAt: string | null;
}

export async function listPaidInvoicesForStudent(
  rosterStudentId: string,
): Promise<PaidInvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) return [];

  // Ownership check first — the teacher can only see receipts for
  // their own roster.
  const { data: roster } = await admin
    .from("roster_students")
    .select("teacher_id, monthly_tuition_cents")
    .eq("id", rosterStudentId)
    .maybeSingle();
  if (!roster) return [];
  if ((roster as { teacher_id: string }).teacher_id !== user.id) return [];
  const fallbackCents =
    (roster as { monthly_tuition_cents: number | null }).monthly_tuition_cents ??
    0;

  const { data: pays } = await admin
    .from("student_payments")
    .select("id, billing_month, amount_cents, paid, paid_at")
    .eq("roster_student_id", rosterStudentId)
    .eq("paid", true)
    .order("billing_month", { ascending: false })
    .limit(240);

  return ((pays ?? []) as Array<{
    id: string;
    billing_month: string;
    amount_cents: number | null;
    paid: boolean;
    paid_at: string | null;
  }>).map((p) => ({
    paymentId: p.id,
    billingMonth: p.billing_month.slice(0, 10),
    amountCents: p.amount_cents ?? fallbackCents,
    paidAt: p.paid_at,
  }));
}

// -----------------------------------------------------------------------------
// Sysadmin platform-overview report
// -----------------------------------------------------------------------------

export interface SysadminReportData {
  generatedAt: string;
  scale: {
    teachers: number;
    students: number;
    classrooms: number;
    rosterEntries: number;
    catalogLessons: number;
    catalogSongs: number;
  };
  activity: {
    dau: number;
    wau: number;
    mau: number;
    xpLast30d: number;
    lessonsAssignedLast30d: number;
    lessonsCompletedLast30d: number;
    aiMessagesLast30d: number;
    newAccountsLast30d: number;
  };
  teachers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    studentCount: number;
    classroomsCount: number;
    activeStudentsLast30d: number;
    createdAt: string;
  }>;
}

export async function getSysadminReport(): Promise<
  SysadminReportData | { error: string }
> {
  const owner = await isOwner();
  if (!owner) return { error: "Apenas sysadmin" };

  // Reuse the existing overview action — same numbers the dashboard
  // shows, which keeps the two surfaces in agreement.
  const { getSysadminOverview } = await import("@/lib/actions/sysadmin");
  const overview = await getSysadminOverview();
  if ("error" in overview) return { error: overview.error };
  return {
    generatedAt: new Date().toISOString(),
    scale: {
      teachers: overview.kpis.teachers,
      students: overview.kpis.students,
      classrooms: overview.kpis.classrooms,
      rosterEntries: overview.kpis.rosterEntries,
      catalogLessons: overview.kpis.catalogLessons,
      catalogSongs: overview.kpis.catalogSongs,
    },
    activity: {
      dau: overview.kpis.dau,
      wau: overview.kpis.wau,
      mau: overview.kpis.mau,
      xpLast30d: overview.kpis.xpLast30d,
      lessonsAssignedLast30d: overview.kpis.lessonsAssignedLast30d,
      lessonsCompletedLast30d: overview.kpis.lessonsCompletedLast30d,
      aiMessagesLast30d: overview.kpis.aiMessagesLast30d,
      newAccountsLast30d: overview.kpis.newAccountsLast30d,
    },
    teachers: overview.allTeachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      studentCount: t.studentCount,
      classroomsCount: t.classroomsCount,
      activeStudentsLast30d: t.activeStudentsLast30d,
      createdAt: t.createdAt,
    })),
  };
}
