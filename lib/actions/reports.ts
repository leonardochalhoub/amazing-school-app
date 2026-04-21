"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";
import { isOwner } from "@/lib/auth/roles";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { yearBounds, type Year } from "@/lib/reports/period";
import { getSignatureSignedUrl } from "@/lib/signature";
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
  /** Signed URL for the teacher's signature image, or null when the
      teacher hasn't opted in / hasn't uploaded. Expires ~10 min
      after the report is rendered. */
  signatureUrl: string | null;
  signatureEnabled: boolean;
}

async function loadTeacherBrand(
  admin: ReturnType<typeof createAdminClient>,
  teacherId: string,
): Promise<TeacherBrand> {
  // profiles has no email column — email is auth-only. We query
  // profiles for the branding/signature fields, then resolve email
  // + full_name fallbacks from auth.users in parallel.
  const [profileRes, authRes] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, full_name, school_logo_enabled, school_logo_url, signature_url, signature_enabled",
      )
      .eq("id", teacherId)
      .maybeSingle(),
    admin.auth.admin.getUserById(teacherId),
  ]);
  const profile = profileRes.data as {
    full_name: string | null;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
    signature_url: string | null;
    signature_enabled: boolean | null;
  } | null;

  const authUser = authRes.data?.user;
  let fullName = profile?.full_name ?? null;
  let email = authUser?.email ?? null;

  if (!fullName && authUser) {
    const metaName =
      (authUser.user_metadata as { full_name?: string } | undefined)
        ?.full_name ?? null;
    fullName =
      metaName ??
      (authUser.email ? authUser.email.split("@")[0] ?? null : null);
  }

  const signatureEnabled = profile?.signature_enabled === true;
  const signatureUrl =
    signatureEnabled && profile?.signature_url
      ? await getSignatureSignedUrl(admin, teacherId)
      : null;

  return {
    id: teacherId,
    fullName,
    email,
    schoolLogoEnabled: profile?.school_logo_enabled ?? false,
    schoolLogoUrl: profile?.school_logo_url ?? null,
    signatureUrl,
    signatureEnabled,
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
  /** "lesson" / "music" come from the catalog. "live" is a held
   *  class (status='Done' with both event_time + end_time set) so
   *  live-class minutes flow into curriculum totals + skill split. */
  kind: "lesson" | "music" | "live";
  title: string;
  /** Normalised CEFR family (A1, A2, B1, B2, C1, C2). Never "A1.1"
      etc. — the sub-semester split is collapsed at the data layer
      so the report column is official. */
  cefr: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  status: "assigned" | "skipped" | "completed";
  assignedAt: string | null;
  completedAt: string | null;
  xpEarned: number | null;
}

export interface CurriculumBreakdownRow {
  key: string;
  label: string;
  assigned: number;
  completed: number;
  estimatedMinutes: number;
  xp: number;
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
    totalEstimatedMinutes: number;
    byType: CurriculumBreakdownRow[];
    bySkill: CurriculumBreakdownRow[];
    byCefr: Array<{ cefr: string; assigned: number; completed: number }>;
    byMonth: Array<{
      month: string;
      lessons: number;
      music: number;
      live: number;
    }>;
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
  const role = (profile as { role?: string } | null)?.role ?? "";

  const { data: rosterRaw, error } = await admin
    .from("roster_students")
    .select(
      "id, teacher_id, full_name, preferred_name, auth_user_id, classroom_id, level, billing_starts_on, ended_on, created_at, classrooms(name, deleted_at)",
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

  // Dual-role access: a teacher sees curricula for their own roster,
  // and a student sees their own curriculum (matched by auth_user_id).
  const isTeacher = isTeacherRole(role);
  const isSelf = roster.auth_user_id === user.id;
  if (isTeacher) {
    if (roster.teacher_id !== user.id) {
      return { error: "Aluno não pertence a este professor" };
    }
  } else if (!isSelf) {
    return { error: "Sem permissão" };
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

  // Completion timestamps + per-lesson XP — both pulled from the
  // same auth user. XP lives in xp_events; we key by source_id
  // (the lesson_slug) so each curriculum entry can display what
  // it actually earned.
  const progressBySlug = new Map<string, { completedAt: string }>();
  const xpBySlug = new Map<string, number>();
  let totalXp = 0;
  if (roster.auth_user_id) {
    const [progRes, xpRes] = await Promise.all([
      admin
        .from("lesson_progress")
        .select("lesson_slug, completed_at")
        .eq("student_id", roster.auth_user_id)
        .not("completed_at", "is", null)
        .limit(10_000),
      admin
        .from("xp_events")
        .select("xp_amount, source, source_id, created_at")
        .eq("student_id", roster.auth_user_id)
        .limit(50_000),
    ]);
    for (const p of (progRes.data ?? []) as Array<{
      lesson_slug: string;
      completed_at: string;
    }>) {
      const existing = progressBySlug.get(p.lesson_slug);
      if (!existing || existing.completedAt < p.completed_at) {
        progressBySlug.set(p.lesson_slug, { completedAt: p.completed_at });
      }
    }
    for (const ev of (xpRes.data ?? []) as Array<{
      xp_amount: number;
      source: string | null;
      source_id: string | null;
      created_at: string;
    }>) {
      if (!withinYear(ev.created_at, year)) continue;
      const amount = ev.xp_amount ?? 0;
      totalXp += amount;
      if (ev.source === "lesson" && ev.source_id) {
        xpBySlug.set(ev.source_id, (xpBySlug.get(ev.source_id) ?? 0) + amount);
      }
    }
  }

  /** Collapse CEFR sub-semester codes (A1.1, A1.2, …) into the
      canonical family (A1, A2, B1, B2, C1, C2). Returns null for
      unclassified content (filtered out of the curriculum below). */
  function cefrFamily(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const match = raw.toUpperCase().match(/^[A-Z][0-9]/);
    return match ? match[0] : null;
  }

  const rawEntries: CurriculumEntry[] = (assignments ?? []).map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lesson_slug as string);
    const prog = progressBySlug.get(a.lesson_slug as string);
    const completedAt =
      prog?.completedAt ??
      (a.status === "completed" ? (a.assigned_at as string) : null);
    // Per-entry XP — for music the slug is "music:<slug>", which is
    // what xp_events.source_id stores too. Lessons match by bare slug.
    const xpKey =
      kind === "music" ? `music:${slug}` : (a.lesson_slug as string);
    const xpEarned = xpBySlug.get(xpKey) ?? null;
    if (kind === "music") {
      const m = getMusic(slug);
      return {
        slug,
        kind: "music" as const,
        title: m ? `${m.artist} — ${m.title}` : slug,
        cefr: cefrFamily(m?.cefr_level ?? null),
        category: "music",
        // Music has no explicit minutes field; assume ~5 min per song
        // so the totals line up with the gamification engine's estimate.
        estimatedMinutes: m ? 5 : null,
        status: a.status as "assigned" | "skipped" | "completed",
        assignedAt: a.assigned_at as string,
        completedAt,
        xpEarned,
      };
    }
    const meta = findLessonMeta(slug);
    return {
      slug,
      kind: "lesson" as const,
      title: meta?.title ?? slug,
      cefr: cefrFamily(meta?.cefr_level ?? null),
      category: meta?.category ?? null,
      estimatedMinutes: meta?.estimated_minutes ?? null,
      status: a.status as "assigned" | "skipped" | "completed",
      assignedAt: a.assigned_at as string,
      completedAt,
      xpEarned,
    };
  });

  // -------------------------------------------------------------
  // Live classes — pull every Done row with a computed duration
  // for this student (per-roster + classroom-wide) and turn each
  // into one curriculum entry per skill_focus tag (so a 60-min
  // class tagged "Listening, Speaking" produces one 30-min row in
  // each bucket — same split logic as getLiveClassSummaryForRoster).
  // -------------------------------------------------------------
  type HistRow = {
    id: string;
    event_date: string;
    duration_minutes: number | null;
    skill_focus: string[] | null;
    lesson_content: string | null;
  };
  const perStudentHist = await admin
    .from("student_history")
    .select("id, event_date, duration_minutes, skill_focus, lesson_content")
    .eq("roster_student_id", rosterStudentId)
    .not("duration_minutes", "is", null);
  const classroomWideHist = roster.classroom_id
    ? await admin
        .from("student_history")
        .select("id, event_date, duration_minutes, skill_focus, lesson_content")
        .eq("classroom_id", roster.classroom_id)
        .is("roster_student_id", null)
        .not("duration_minutes", "is", null)
    : { data: [] as HistRow[] };

  const liveRows = [
    ...((perStudentHist.data ?? []) as HistRow[]),
    ...((classroomWideHist.data ?? []) as HistRow[]),
  ];
  const liveEntries: CurriculumEntry[] = [];
  for (const r of liveRows) {
    const minutes = r.duration_minutes ?? 0;
    if (minutes <= 0) continue;
    const tags = (Array.isArray(r.skill_focus) ? r.skill_focus : [])
      .map((t) => (t ?? "").toLowerCase())
      .filter(Boolean);
    const buckets = tags.length > 0 ? tags : ["live"];
    const eachMin = Math.round(minutes / buckets.length);
    for (let i = 0; i < buckets.length; i++) {
      const skill = buckets[i];
      liveEntries.push({
        slug: `live:${r.id}:${skill}`,
        kind: "live",
        title: (r.lesson_content?.trim() || "Aula ao vivo").slice(0, 120),
        cefr: roster.level ? cefrFamily(roster.level) : null,
        category: skill,
        estimatedMinutes: eachMin,
        status: "completed",
        assignedAt: r.event_date,
        completedAt: r.event_date,
        xpEarned: null,
      });
    }
  }
  rawEntries.push(...liveEntries);

  // Filter to the selected year + drop unclassified rows. Live
  // entries with no inferable CEFR (student.level missing) still
  // pass through — they get a "—" CEFR slot but still count toward
  // type/skill aggregates and totalEstimatedMinutes.
  const entries = rawEntries.filter(
    (e) =>
      (e.kind === "live" || !!e.cefr) &&
      (withinYear(e.assignedAt, year) || withinYear(e.completedAt, year)),
  );

  // Stats. CEFR already aggregated at the entry level (A1/A2/B1/...).
  const byCefrMap = new Map<string, { assigned: number; completed: number }>();
  const byMonthMap = new Map<
    string,
    { lessons: number; music: number; live: number }
  >();
  // New: breakdowns by Type (Lição / Música) and by Skill category
  // (grammar, speaking, etc.). Each carries count, completed, XP,
  // and estimated time — the "Resumo" section on the print page
  // renders these as two side-by-side summary tables.
  const TYPE_LABEL: Record<"lesson" | "music" | "live", string> = {
    lesson: "Lição",
    music: "Música",
    live: "Aula ao vivo",
  };
  const SKILL_LABEL: Record<string, string> = {
    grammar: "Gramática",
    vocabulary: "Vocabulário",
    reading: "Leitura",
    writing: "Escrita",
    listening: "Escuta",
    narrative: "Narrativa",
    speaking: "Conversação",
    dialog: "Diálogo",
    music: "Música",
    live: "Aula ao vivo",
  };
  const byTypeMap = new Map<string, CurriculumBreakdownRow>();
  const bySkillMap = new Map<string, CurriculumBreakdownRow>();
  let totalEstimatedMinutes = 0;

  function bumpBreakdown(
    map: Map<string, CurriculumBreakdownRow>,
    key: string,
    label: string,
    entry: CurriculumEntry,
  ) {
    const row = map.get(key) ?? {
      key,
      label,
      assigned: 0,
      completed: 0,
      estimatedMinutes: 0,
      xp: 0,
    };
    row.assigned += 1;
    if (entry.status === "completed") {
      row.completed += 1;
      row.xp += entry.xpEarned ?? 0;
      row.estimatedMinutes += entry.estimatedMinutes ?? 0;
    }
    map.set(key, row);
  }

  for (const e of entries) {
    const slot = byCefrMap.get(e.cefr ?? "—") ?? { assigned: 0, completed: 0 };
    slot.assigned += 1;
    if (e.status === "completed") {
      slot.completed += 1;
      totalEstimatedMinutes += e.estimatedMinutes ?? 0;
      if (e.completedAt) {
        const m = e.completedAt.slice(0, 7);
        const bucket = byMonthMap.get(m) ?? {
          lessons: 0,
          music: 0,
          live: 0,
        };
        if (e.kind === "music") bucket.music += 1;
        else if (e.kind === "live") bucket.live += 1;
        else bucket.lessons += 1;
        byMonthMap.set(m, bucket);
      }
    }
    byCefrMap.set(e.cefr ?? "—", slot);

    bumpBreakdown(byTypeMap, e.kind, TYPE_LABEL[e.kind], e);
    const skillKey = (e.category ?? "mixed").toLowerCase();
    bumpBreakdown(
      bySkillMap,
      skillKey,
      SKILL_LABEL[skillKey] ?? skillKey,
      e,
    );
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

  return {
    teacher,
    student: {
      id: roster.id,
      fullName: roster.full_name,
      preferredName: roster.preferred_name,
      level: roster.level,
      classroomName: activeClassroomName(roster.classrooms),
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
      totalEstimatedMinutes,
      byType: Array.from(byTypeMap.values()).sort(
        (a, b) => b.completed - a.completed,
      ),
      bySkill: Array.from(bySkillMap.values()).sort(
        (a, b) => b.completed - a.completed,
      ),
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
    .select("id, full_name, auth_user_id, classroom_id, level, classrooms(name, deleted_at)")
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
          .select(
            "id, classroom_id, roster_student_id, student_id, status, assigned_at",
          )
          .in("classroom_id", classroomIds.concat([]))
          .gte("assigned_at", fromIso)
          .lt("assigned_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
    studentAuthIds.length > 0
      ? admin
          .from("lesson_progress")
          .select("student_id, completed_at")
          .in("student_id", studentAuthIds)
          .not("completed_at", "is", null)
          .gte("completed_at", fromIso)
          .lt("completed_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
    studentAuthIds.length > 0
      ? admin
          .from("xp_events")
          .select("student_id, xp_amount, created_at")
          .in("student_id", studentAuthIds)
          .gte("created_at", fromIso)
          .lt("created_at", toIso)
          .limit(50_000)
      : Promise.resolve({ data: [] }),
  ]);

  const assignmentsByRoster = new Map<string, number>();
  // Teacher-marked-completed counts — mirror the student dashboard
  // so the cohort totals match what the UI shows elsewhere. We count
  // per-student assignments directly and classroom-wide ones against
  // every roster member of that classroom.
  const completedAssignmentsByRoster = new Map<string, number>();
  const assignmentLastDateByRoster = new Map<string, string>();

  for (const a of (assignmentsRes.data ?? []) as Array<{
    roster_student_id: string | null;
    classroom_id: string | null;
    status: string;
    assigned_at: string;
  }>) {
    if (a.roster_student_id) {
      assignmentsByRoster.set(
        a.roster_student_id,
        (assignmentsByRoster.get(a.roster_student_id) ?? 0) + 1,
      );
      if (a.status === "completed") {
        completedAssignmentsByRoster.set(
          a.roster_student_id,
          (completedAssignmentsByRoster.get(a.roster_student_id) ?? 0) + 1,
        );
        const prev = assignmentLastDateByRoster.get(a.roster_student_id);
        if (!prev || prev < a.assigned_at) {
          assignmentLastDateByRoster.set(a.roster_student_id, a.assigned_at);
        }
      }
    } else if (a.classroom_id) {
      for (const r of roster.filter((x) => x.classroom_id === a.classroom_id)) {
        assignmentsByRoster.set(r.id, (assignmentsByRoster.get(r.id) ?? 0) + 1);
        if (a.status === "completed") {
          completedAssignmentsByRoster.set(
            r.id,
            (completedAssignmentsByRoster.get(r.id) ?? 0) + 1,
          );
          const prev = assignmentLastDateByRoster.get(r.id);
          if (!prev || prev < a.assigned_at) {
            assignmentLastDateByRoster.set(r.id, a.assigned_at);
          }
        }
      }
    }
  }

  // Student-self-completed (lesson_progress) by auth id. We MERGE this
  // with the teacher-marked completions — whichever is larger wins,
  // so teachers who track everything manually see meaningful numbers.
  const completedByAuth = new Map<string, number>();
  const lastActivityByAuth = new Map<string, string>();
  for (const p of (progressRes.data ?? []) as Array<{
    student_id: string;
    completed_at: string;
  }>) {
    completedByAuth.set(
      p.student_id,
      (completedByAuth.get(p.student_id) ?? 0) + 1,
    );
    const prev = lastActivityByAuth.get(p.student_id);
    if (!prev || prev < p.completed_at) {
      lastActivityByAuth.set(p.student_id, p.completed_at);
    }
  }

  // XP — xp_events.xp_amount is the canonical column (not "amount").
  const xpByAuth = new Map<string, number>();
  for (const ev of (xpRes.data ?? []) as Array<{
    student_id: string;
    xp_amount: number | null;
  }>) {
    xpByAuth.set(
      ev.student_id,
      (xpByAuth.get(ev.student_id) ?? 0) + (ev.xp_amount ?? 0),
    );
  }

  const studentRows: CohortStudentRow[] = roster.map((r) => {
    const authId = r.auth_user_id;
    const progressCount = authId ? completedByAuth.get(authId) ?? 0 : 0;
    const manualCount = completedAssignmentsByRoster.get(r.id) ?? 0;
    const lessonsCompleted = Math.max(progressCount, manualCount);
    const lastProgress = authId ? lastActivityByAuth.get(authId) ?? null : null;
    const lastManual = assignmentLastDateByRoster.get(r.id) ?? null;
    const lastActivity =
      lastProgress && lastManual
        ? lastProgress > lastManual
          ? lastProgress
          : lastManual
        : lastProgress ?? lastManual;
    return {
      id: r.id,
      fullName: r.full_name,
      classroomName: activeClassroomName(r.classrooms),
      level: r.level,
      totalXp: authId ? xpByAuth.get(authId) ?? 0 : 0,
      lessonsCompleted,
      lessonsAssigned: assignmentsByRoster.get(r.id) ?? 0,
      streak: 0,
      lastActivity,
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
      "id, full_name, classroom_id, monthly_tuition_cents, billing_starts_on, ended_on, created_at, classrooms(name, deleted_at)",
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

      // Only months the teacher officially tracked count toward the
      // totals — a "none" cell (never clicked) means there's no
      // invoice to collect, and shouldn't drag the collection rate
      // down. Paid + due are the two official states.
      if (state === "paid") {
        rowPaid += amt ?? 0;
        invoicesPaid += 1;
        paidCents += amt ?? 0;
      } else if (state === "due" && amt && amt > 0) {
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
      classroomName: activeClassroomName(r.classrooms),
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
    gender: "female" | "male" | null;
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
  const role = (profile as { role?: string } | null)?.role ?? "";

  const { data: paymentRaw } = await admin
    .from("student_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!paymentRaw) return { error: "Pagamento não encontrado" };
  const payment = paymentRaw as StudentPaymentRow & {
    receipt_number?: string | null;
  };
  if (!payment.paid) {
    return {
      error:
        "Recibo disponível apenas para pagamentos confirmados (marque como pago primeiro).",
    };
  }

  const { data: rosterRaw } = await admin
    .from("roster_students")
    .select(
      "id, full_name, email, gender, classroom_id, monthly_tuition_cents, auth_user_id, receipts_visible_to_student, classrooms(name, deleted_at)",
    )
    .eq("id", payment.roster_student_id)
    .maybeSingle();
  if (!rosterRaw) return { error: "Aluno não encontrado" };
  const roster = rosterRaw as {
    id: string;
    full_name: string;
    email: string | null;
    gender: "female" | "male" | null;
    classroom_id: string | null;
    monthly_tuition_cents: number | null;
    auth_user_id: string | null;
    receipts_visible_to_student: boolean;
    classrooms: { name: string } | { name: string }[] | null;
  };

  // Dual-role access. Teacher sees their own roster's receipts; the
  // linked student sees their own when their teacher has enabled
  // receipts_visible_to_student. Every other caller is rejected.
  const isTeacher = isTeacherRole(role);
  if (isTeacher) {
    if (payment.teacher_id !== user.id) {
      return { error: "Sem permissão sobre este pagamento" };
    }
  } else {
    if (roster.auth_user_id !== user.id) {
      return { error: "Sem permissão" };
    }
    if (!roster.receipts_visible_to_student) {
      return { error: "Recibo não liberado pelo professor" };
    }
  }

  const teacher = await loadTeacherBrand(admin, payment.teacher_id);

  // Receipt number — prefer the DB-stored + unique-indexed value
  // (migration 046). Fallback to the derived shape so older rows
  // still render the same number they had before the migration.
  const month = payment.billing_month.slice(0, 7).replace("-", "");
  const suffix = payment.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const receiptNumber =
    payment.receipt_number?.trim() || `AS-${month}-${suffix}`;

  return {
    teacher,
    student: {
      id: roster.id,
      fullName: roster.full_name,
      email: roster.email,
      gender: roster.gender,
      classroomName: activeClassroomName(roster.classrooms),
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
  /** Only meaningful on the teacher-side list — student-side only
      returns already-shared rows, so this field is always true there. */
  sharedWithStudent: boolean;
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
    .select(
      "id, billing_month, amount_cents, paid, paid_at, shared_with_student",
    )
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
    shared_with_student: boolean | null;
  }>).map((p) => ({
    paymentId: p.id,
    billingMonth: p.billing_month.slice(0, 10),
    amountCents: p.amount_cents ?? fallbackCents,
    paidAt: p.paid_at,
    sharedWithStudent: p.shared_with_student === true,
  }));
}

/**
 * Flat list of every paid receipt across the teacher's roster,
 * joined with the student name + master-visibility flag. Ordered by
 * paid_at DESC (falls back to billing_month) so the newest receipt
 * reads first in the query dialog.
 */
export interface TeacherReceiptRow {
  paymentId: string;
  rosterStudentId: string;
  studentName: string;
  classroomName: string | null;
  billingMonth: string;
  amountCents: number;
  paidAt: string | null;
  sharedWithStudent: boolean;
  receiptsVisibleToStudent: boolean;
}

export async function listTeacherReceipts(): Promise<TeacherReceiptRow[]> {
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

  // Pull the teacher's roster first so we can resolve names + the
  // master visibility flag in one round-trip.
  const { data: rosterRows } = await admin
    .from("roster_students")
    .select(
      "id, full_name, classroom_id, monthly_tuition_cents, receipts_visible_to_student, classrooms(name, deleted_at)",
    )
    .eq("teacher_id", user.id);
  const rosters = new Map<
    string,
    {
      full_name: string;
      classroom_name: string | null;
      monthly_tuition_cents: number | null;
      receipts_visible_to_student: boolean;
    }
  >();
  for (const r of (rosterRows ?? []) as Array<{
    id: string;
    full_name: string;
    classroom_id: string | null;
    monthly_tuition_cents: number | null;
    receipts_visible_to_student: boolean;
    classrooms:
      | { name: string; deleted_at?: string | null }
      | Array<{ name: string; deleted_at?: string | null }>
      | null;
  }>) {
    rosters.set(r.id, {
      full_name: r.full_name,
      classroom_name: activeClassroomName(r.classrooms),
      monthly_tuition_cents: r.monthly_tuition_cents,
      receipts_visible_to_student: r.receipts_visible_to_student === true,
    });
  }
  if (rosters.size === 0) return [];

  const { data: pays } = await admin
    .from("student_payments")
    .select(
      "id, roster_student_id, billing_month, amount_cents, paid_at, shared_with_student",
    )
    .in("roster_student_id", Array.from(rosters.keys()))
    .eq("paid", true)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(5_000);

  return ((pays ?? []) as Array<{
    id: string;
    roster_student_id: string;
    billing_month: string;
    amount_cents: number | null;
    paid_at: string | null;
    shared_with_student: boolean | null;
  }>).map((p) => {
    const r = rosters.get(p.roster_student_id);
    return {
      paymentId: p.id,
      rosterStudentId: p.roster_student_id,
      studentName: r?.full_name ?? "—",
      classroomName: r?.classroom_name ?? null,
      billingMonth: p.billing_month.slice(0, 10),
      amountCents: p.amount_cents ?? r?.monthly_tuition_cents ?? 0,
      paidAt: p.paid_at,
      sharedWithStudent: p.shared_with_student === true,
      receiptsVisibleToStudent: r?.receipts_visible_to_student ?? false,
    };
  });
}

/**
 * Teacher flips a single paid receipt "shared with student" on or
 * off. The master `receipts_visible_to_student` flag on the roster
 * row is a prerequisite — without it, the student never sees any
 * receipt regardless of the per-payment state.
 */
export async function setReceiptSharedWithStudent(
  paymentId: string,
  shared: boolean,
): Promise<{ success: true } | { error: string }> {
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

  const { data: payment } = await admin
    .from("student_payments")
    .select("teacher_id, roster_student_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { error: "Pagamento não encontrado" };
  if ((payment as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const { error } = await admin
    .from("student_payments")
    .update({
      shared_with_student: shared,
      shared_with_student_at: shared ? new Date().toISOString() : null,
    })
    .eq("id", paymentId);
  if (error) return { error: error.message };

  const rosterId = (payment as { roster_student_id: string }).roster_student_id;
  revalidatePath(`/teacher/students/${rosterId}`);
  revalidatePath("/student/profile");
  return { success: true as const };
}

// -----------------------------------------------------------------------------
// Per-student "receipts visible to student" toggle — owned by teacher.
// -----------------------------------------------------------------------------

export async function setReceiptsVisibleToStudent(
  rosterStudentId: string,
  visible: boolean,
): Promise<{ success: true } | { error: string }> {
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

  const { data: roster } = await admin
    .from("roster_students")
    .select("teacher_id")
    .eq("id", rosterStudentId)
    .maybeSingle();
  if (!roster) return { error: "Aluno não encontrado" };
  if ((roster as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const { error } = await admin
    .from("roster_students")
    .update({ receipts_visible_to_student: visible })
    .eq("id", rosterStudentId);
  if (error) return { error: error.message };

  revalidatePath(`/teacher/students/${rosterStudentId}`);
  revalidatePath("/student/profile");
  return { success: true as const };
}

// -----------------------------------------------------------------------------
// Student-side: resolve own roster + list receipts (when visible).
// -----------------------------------------------------------------------------

export interface MyRosterIdentity {
  rosterId: string | null;
  receiptsVisible: boolean;
  billingStartsOn: string | null;
  createdAt: string | null;
}

export async function getMyRosterIdentity(): Promise<MyRosterIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      rosterId: null,
      receiptsVisible: false,
      billingStartsOn: null,
      createdAt: null,
    };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("roster_students")
    .select(
      "id, receipts_visible_to_student, billing_starts_on, created_at",
    )
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!data) {
    return {
      rosterId: null,
      receiptsVisible: false,
      billingStartsOn: null,
      createdAt: null,
    };
  }
  const row = data as {
    id: string;
    receipts_visible_to_student: boolean;
    billing_starts_on: string | null;
    created_at: string | null;
  };
  return {
    rosterId: row.id,
    receiptsVisible: row.receipts_visible_to_student,
    billingStartsOn: row.billing_starts_on,
    createdAt: row.created_at,
  };
}

/**
 * Student-facing paid-invoices list. Returns an empty array unless
 * the teacher has toggled `receipts_visible_to_student = true`.
 */
export async function listMyReceipts(): Promise<PaidInvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("roster_students")
    .select("id, receipts_visible_to_student, monthly_tuition_cents")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!roster) return [];
  const r = roster as {
    id: string;
    receipts_visible_to_student: boolean;
    monthly_tuition_cents: number | null;
  };
  if (!r.receipts_visible_to_student) return [];

  // Student-side: only return receipts the teacher has explicitly
  // opted to share. Desc by billing_month so newest shows first.
  const { data: pays } = await admin
    .from("student_payments")
    .select("id, billing_month, amount_cents, paid, paid_at")
    .eq("roster_student_id", r.id)
    .eq("paid", true)
    .eq("shared_with_student", true)
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
    amountCents: p.amount_cents ?? r.monthly_tuition_cents ?? 0,
    paidAt: p.paid_at,
    sharedWithStudent: true,
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
    location: string | null;
    studentCount: number;
    classroomsCount: number;
    activeStudentsLast30d: number;
    createdAt: string;
  }>;
}

/** Leo's origin-owner email — excluded from the sysadmin report
    even when his profile.role hasn't been flipped to 'owner' yet. */
const ORIGIN_OWNER_EMAIL = "leochalhoub@hotmail.com";

/**
 * Pulls the name of a non-soft-deleted classroom from a roster_students
 * join result. Returns null if the classroom was deleted — reports
 * should NOT carry a stale classroom tag after the teacher removed it.
 */
function activeClassroomName(
  c:
    | { name: string; deleted_at?: string | null }
    | Array<{ name: string; deleted_at?: string | null }>
    | null
    | undefined,
): string | null {
  const row = Array.isArray(c) ? c[0] : c;
  if (!row) return null;
  if (row.deleted_at) return null;
  return row.name ?? null;
}

export async function getSysadminReport(): Promise<
  SysadminReportData | { error: string }
> {
  const owner = await isOwner();
  if (!owner) return { error: "Apenas sysadmin" };

  // The report excludes:
  //   - the origin-owner account (Leo)
  //   - any profile flagged is_test=true or role='owner'
  //   - demo accounts (email prefix "demo.")
  // so the KPIs + directory reflect real paying teachers only.
  // Students rostered under excluded teachers are filtered too.

  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgoISO = new Date(
    now.getTime() - 30 * 86_400_000,
  ).toISOString();
  const todayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10);
  const sevenDaysAgoISO = new Date(now.getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    profilesRes,
    classroomsRes,
    rosterRes,
    xpRes,
    assignmentsRes,
    progressRes,
    messagesRes,
    dailyTodayRes,
    dailyWeekRes,
    dailyMonthRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, is_test, created_at, location")
      .order("created_at", { ascending: false }),
    admin
      .from("classrooms")
      .select("id, teacher_id")
      .is("deleted_at", null),
    admin
      .from("roster_students")
      .select("id, teacher_id, auth_user_id")
      .is("deleted_at", null),
    admin
      .from("xp_events")
      .select("student_id, xp_amount, created_at")
      .gte("created_at", thirtyDaysAgoISO)
      .limit(100_000),
    admin
      .from("lesson_assignments")
      .select("id, classroom_id, assigned_at")
      .gte("assigned_at", thirtyDaysAgoISO)
      .limit(100_000),
    admin
      .from("lesson_progress")
      .select("id, student_id, completed_at")
      .not("completed_at", "is", null)
      .gte("completed_at", thirtyDaysAgoISO)
      .limit(100_000),
    admin
      .from("messages")
      .select("id, created_at")
      .gte("created_at", thirtyDaysAgoISO)
      .limit(100_000),
    admin
      .from("daily_activity")
      .select("student_id")
      .eq("activity_date", todayISO),
    admin
      .from("daily_activity")
      .select("student_id")
      .gte("activity_date", sevenDaysAgoISO),
    admin
      .from("daily_activity")
      .select("student_id")
      .gte("activity_date", thirtyDaysAgoISO.slice(0, 10)),
  ]);

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    role: string;
    is_test: boolean | null;
    created_at: string;
  }>;

  // Build the exclusion set. Auth list gives us emails; we use it
  // both for Leo's origin-owner backstop and for the demo-prefix
  // heuristic. is_test + role='owner' come from the profile itself.
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const authUserById = new Map<string, { email: string | null }>();
  for (const u of authList?.users ?? []) {
    authUserById.set(u.id, { email: u.email ?? null });
  }

  const excludedTeacherIds = new Set<string>();
  for (const p of profiles) {
    const email = (authUserById.get(p.id)?.email ?? "").toLowerCase().trim();
    const isDemo = email.startsWith("demo.");
    const isOwnerRole = p.role === "owner";
    const isLeo = email === ORIGIN_OWNER_EMAIL;
    if (p.is_test === true || isOwnerRole || isDemo || isLeo) {
      excludedTeacherIds.add(p.id);
    }
  }

  const teachers = profiles.filter(
    (p) =>
      (p.role === "teacher" || p.role === "owner") &&
      !excludedTeacherIds.has(p.id),
  );
  const students = profiles.filter(
    (p) => p.role === "student" && !excludedTeacherIds.has(p.id),
  );

  const classrooms = ((classroomsRes.data ?? []) as Array<{
    id: string;
    teacher_id: string;
  }>).filter((c) => !excludedTeacherIds.has(c.teacher_id));
  const classroomsByTeacher = new Map<string, number>();
  const classroomTeacherById = new Map<string, string>();
  for (const c of classrooms) {
    classroomsByTeacher.set(
      c.teacher_id,
      (classroomsByTeacher.get(c.teacher_id) ?? 0) + 1,
    );
    classroomTeacherById.set(c.id, c.teacher_id);
  }

  const rosterRows = ((rosterRes.data ?? []) as Array<{
    teacher_id: string;
    auth_user_id: string | null;
  }>).filter((r) => !excludedTeacherIds.has(r.teacher_id));
  const rosterByTeacher = new Map<string, number>();
  // Students (auth users) linked to included rosters — used to
  // filter XP / activity / progress numbers below.
  const includedStudentAuthIds = new Set<string>();
  for (const r of rosterRows) {
    rosterByTeacher.set(
      r.teacher_id,
      (rosterByTeacher.get(r.teacher_id) ?? 0) + 1,
    );
    if (r.auth_user_id) includedStudentAuthIds.add(r.auth_user_id);
  }

  // KPIs — xp_events / lesson_progress / daily_activity are all
  // student-scoped. We keep only rows whose student_id belongs to
  // an included roster so Leo's and demo activity never leak in.
  const xpLast30d = (xpRes.data ?? [])
    .filter((r) =>
      includedStudentAuthIds.has(
        (r as { student_id?: string }).student_id ?? "",
      ),
    )
    .reduce(
      (s, r) => s + ((r as { xp_amount: number | null }).xp_amount ?? 0),
      0,
    );
  // lesson_assignments doesn't carry a direct student_id, so we
  // filter via classroom_id → included classrooms.
  const includedClassroomIds = new Set(classrooms.map((c) => c.id));
  const lessonsAssignedLast30d = (assignmentsRes.data ?? []).filter((r) =>
    includedClassroomIds.has(
      (r as { classroom_id?: string }).classroom_id ?? "",
    ),
  ).length;
  const lessonsCompletedLast30d = (progressRes.data ?? []).filter((r) =>
    includedStudentAuthIds.has(
      (r as { student_id?: string }).student_id ?? "",
    ),
  ).length;
  const aiMessagesLast30d = (messagesRes.data ?? []).length;
  const newAccountsLast30d = profiles.filter(
    (p) => p.created_at >= thirtyDaysAgoISO && !excludedTeacherIds.has(p.id),
  ).length;

  function activeSize(rows: { data: unknown[] | null } | { data: null }) {
    const ids = new Set(
      ((rows.data ?? []) as Array<{ student_id: string }>)
        .map((r) => r.student_id)
        .filter((id) => includedStudentAuthIds.has(id)),
    );
    return ids.size;
  }
  const dau = activeSize(dailyTodayRes);
  const wau = activeSize(dailyWeekRes);
  const mau = activeSize(dailyMonthRes);

  // Teacher directory (active-student-count scoped to last 30d).
  const activeStudentsByTeacher = new Map<string, Set<string>>();
  const { data: membersRes } = await admin
    .from("classroom_members")
    .select("student_id, classroom_id")
    .limit(100_000);
  const activeStudentIds30d = new Set(
    (dailyMonthRes.data ?? []).map(
      (r) => (r as { student_id: string }).student_id,
    ),
  );
  for (const m of (membersRes ?? []) as Array<{
    student_id: string;
    classroom_id: string;
  }>) {
    if (!activeStudentIds30d.has(m.student_id)) continue;
    const t = classroomTeacherById.get(m.classroom_id);
    if (!t) continue;
    if (!activeStudentsByTeacher.has(t))
      activeStudentsByTeacher.set(t, new Set());
    activeStudentsByTeacher.get(t)!.add(m.student_id);
  }

  // Emails already fetched upstream in `authUserById`, reuse that
  // instead of calling listUsers a second time.
  const teacherEmailById = new Map<string, string | null>();
  for (const [id, info] of authUserById) {
    teacherEmailById.set(id, info.email ?? null);
  }

  // Teacher directory — ranked by student count (desc) so the most
  // engaged schools come first. Ties fall back to name alpha.
  const teacherRows = teachers
    .map((t) => ({
      id: t.id,
      name: t.full_name,
      email: teacherEmailById.get(t.id) ?? null,
      location:
        ((t as { location?: string | null }).location ?? null) || null,
      studentCount: rosterByTeacher.get(t.id) ?? 0,
      classroomsCount: classroomsByTeacher.get(t.id) ?? 0,
      activeStudentsLast30d: activeStudentsByTeacher.get(t.id)?.size ?? 0,
      createdAt: t.created_at,
    }))
    .sort((a, b) => {
      if (b.studentCount !== a.studentCount) {
        return b.studentCount - a.studentCount;
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

  // Catalogue counts come from static JSON (content/ dir), read
  // synchronously so a platform without a published-drafts table
  // still shows real totals on the sysadmin report.
  const { getAllLessons } = await import("@/lib/content/loader");
  const { listMusic } = await import("@/lib/content/music");
  const catalogLessons = getAllLessons().length;
  const catalogSongs = listMusic().length;

  return {
    generatedAt: new Date().toISOString(),
    scale: {
      teachers: teachers.length,
      students: students.length,
      classrooms: classrooms.length,
      rosterEntries: rosterRows.length,
      catalogLessons,
      catalogSongs,
    },
    activity: {
      dau,
      wau,
      mau,
      xpLast30d,
      lessonsAssignedLast30d,
      lessonsCompletedLast30d,
      aiMessagesLast30d,
      newAccountsLast30d,
    },
    teachers: teacherRows,
  };
}
