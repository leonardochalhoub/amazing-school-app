"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Year } from "@/lib/reports/period";

/** Local copy of the withinYear helper (not exported from reports.ts). */
function withinYear(iso: string | null | undefined, year: Year): boolean {
  if (year === "all") return true;
  if (!iso) return false;
  const y = Number(year);
  const d = new Date(iso);
  return d.getFullYear() === y;
}

export interface TeacherCurriculumEntry {
  slug: string;
  kind: "lesson" | "music" | "live";
  title: string;
  cefr: string | null;
  category: string | null;
  minutes: number | null;
  status: "assigned" | "completed";
  assignedAt: string | null;
  completedAt: string | null;
  xpEarned: number | null;
}

export interface TeacherCurriculumReport {
  teacher: {
    id: string;
    fullName: string;
    gender: "female" | "male" | null;
    // TeacherBrand-compatible fields for ReportShell.
    email: string | null;
    schoolLogoEnabled: boolean;
    schoolLogoUrl: string | null;
    signatureUrl: string | null;
    signatureEnabled: boolean;
  };
  year: Year;
  availableYears: number[];
  entries: TeacherCurriculumEntry[];
  live: {
    classCount: number;
    totalMinutes: number;
    speakingMinutes: number;
    listeningMinutes: number;
    otherMinutes: number;
  };
  stats: {
    selfAssigned: number;
    selfCompleted: number;
    totalXp: number;
    estimatedMinutes: number;
    byMonth: Array<{
      month: string;
      lessons: number;
      music: number;
      live: number;
    }>;
  };
  generatedAt: string;
}

/**
 * Teacher's own curriculum report — the mirror of
 * getStudentCurriculumReport for teachers. Self-assignments +
 * self-completions on the lesson/music side, plus live-class hours
 * delivered via teacher_class_hours_v. Designed to be rendered by
 * /print/teacher/[teacherId]/curriculum.
 */
export async function getTeacherOwnCurriculumReport(
  teacherId: string,
  year: Year,
): Promise<TeacherCurriculumReport | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  if (user.id !== teacherId) return { error: "Sem permissão" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "full_name, gender, signature_url, signature_enabled, school_logo_url, school_logo_enabled, role",
    )
    .eq("id", teacherId)
    .maybeSingle();
  const p = profile as {
    full_name: string;
    gender: string | null;
    signature_url: string | null;
    signature_enabled: boolean | null;
    school_logo_url: string | null;
    school_logo_enabled: boolean | null;
    role: string | null;
  } | null;
  if (!p || p.role !== "teacher")
    return { error: "Perfil de professor não encontrado" };

  // Self-assignments the teacher made to themselves
  const { data: assignments } = await admin
    .from("lesson_assignments")
    .select("id, lesson_slug, status, assigned_at")
    .eq("student_id", teacherId)
    .eq("assigned_by", teacherId);

  // lesson_progress completions for this teacher
  const { data: progress } = await admin
    .from("lesson_progress")
    .select("lesson_slug, completed_at")
    .eq("student_id", teacherId)
    .not("completed_at", "is", null);

  const completedBySlug = new Map<string, string>();
  for (const r of (progress ?? []) as Array<{
    lesson_slug: string;
    completed_at: string;
  }>) {
    completedBySlug.set(r.lesson_slug, r.completed_at);
  }

  // XP events (for totalXp + per-entry xpEarned)
  const { data: xpRows } = await admin
    .from("xp_events")
    .select("xp_amount, source, source_id, created_at")
    .eq("student_id", teacherId);
  const xpBySlug = new Map<string, number>();
  let totalXp = 0;
  for (const ev of (xpRows ?? []) as Array<{
    xp_amount: number;
    source: string | null;
    source_id: string | null;
    created_at: string;
  }>) {
    if (!withinYear(ev.created_at, year)) continue;
    const amt = ev.xp_amount ?? 0;
    totalXp += amt;
    if (ev.source === "lesson" && ev.source_id) {
      xpBySlug.set(ev.source_id, (xpBySlug.get(ev.source_id) ?? 0) + amt);
    }
  }

  // Live classes delivered — dedupe-aware view
  const { data: liveRows } = await admin
    .from("teacher_class_hours_v")
    .select(
      "source_row_id, event_date, event_time, end_time, duration_minutes, cefr_level, skill_focus, classroom_id",
    )
    .eq("teacher_id", teacherId);

  // Build entries
  const entries: TeacherCurriculumEntry[] = [];
  let estimatedMinutes = 0;
  let selfAssigned = 0;
  let selfCompleted = 0;

  for (const a of (assignments ?? []) as Array<{
    id: string;
    lesson_slug: string;
    status: string | null;
    assigned_at: string | null;
  }>) {
    const completedAt = completedBySlug.get(a.lesson_slug) ?? null;
    const landed =
      withinYear(a.assigned_at, year) || withinYear(completedAt, year);
    if (!landed) continue;
    const isMusic = a.lesson_slug.startsWith("music:");
    const bareSlug = a.lesson_slug.replace(/^music:/, "");
    selfAssigned += 1;
    if (completedAt) selfCompleted += 1;
    entries.push({
      slug: bareSlug,
      kind: isMusic ? "music" : "lesson",
      title: bareSlug,
      cefr: null,
      category: isMusic ? "music" : null,
      minutes: null,
      status: completedAt ? "completed" : "assigned",
      assignedAt: a.assigned_at,
      completedAt,
      xpEarned: xpBySlug.get(a.lesson_slug) ?? 0,
    });
  }

  let liveTotal = 0;
  let liveSpeaking = 0;
  let liveListening = 0;
  let liveOther = 0;
  let liveCount = 0;
  for (const l of (liveRows ?? []) as Array<{
    source_row_id: string;
    event_date: string;
    duration_minutes: number | null;
    cefr_level: string | null;
    skill_focus: string[] | null;
  }>) {
    if (!withinYear(l.event_date, year)) continue;
    const minutes = l.duration_minutes ?? 0;
    if (minutes <= 0) continue;
    liveCount += 1;
    const skills =
      Array.isArray(l.skill_focus) && l.skill_focus.length > 0
        ? l.skill_focus.map((s) => (s ?? "").toLowerCase()).filter(Boolean)
        : ["live"];
    const each = Math.round(minutes / Math.max(1, skills.length));
    liveTotal += minutes;
    for (const s of skills) {
      if (s === "speaking" || s === "dialog") liveSpeaking += each;
      else if (s === "listening") liveListening += each;
      else if (s !== "live") liveOther += each;
    }
    entries.push({
      slug: `live:${l.source_row_id}`,
      kind: "live",
      title: "Aula ao vivo",
      cefr: l.cefr_level,
      category: skills[0] === "live" ? null : skills[0],
      minutes,
      status: "completed",
      assignedAt: l.event_date,
      completedAt: l.event_date,
      xpEarned: null,
    });
  }

  // By-month for lessons/music/live
  const byMonthMap = new Map<
    string,
    { lessons: number; music: number; live: number }
  >();
  for (const e of entries) {
    if (e.status !== "completed" || !e.completedAt) continue;
    const m = e.completedAt.slice(0, 7);
    const b = byMonthMap.get(m) ?? { lessons: 0, music: 0, live: 0 };
    if (e.kind === "music") b.music += 1;
    else if (e.kind === "live") b.live += 1;
    else b.lessons += 1;
    byMonthMap.set(m, b);
    if (e.kind !== "live") estimatedMinutes += e.minutes ?? 0;
  }

  const years = new Set<number>();
  for (const a of (assignments ?? []) as Array<{ assigned_at: string | null }>) {
    if (a.assigned_at) years.add(new Date(a.assigned_at).getFullYear());
  }
  for (const l of (liveRows ?? []) as Array<{ event_date: string }>) {
    years.add(new Date(l.event_date).getFullYear());
  }
  years.add(new Date().getFullYear());
  const availableYears = Array.from(years)
    .filter((y) => y >= 2020 && y <= new Date().getFullYear() + 1)
    .sort((a, b) => a - b);

  const gender: "female" | "male" | null =
    p.gender === "female" || p.gender === "male" ? p.gender : null;

  return {
    teacher: {
      id: teacherId,
      fullName: p.full_name,
      gender,
      email: user.email ?? null,
      schoolLogoEnabled: p.school_logo_enabled === true,
      schoolLogoUrl: p.school_logo_url,
      signatureUrl: p.signature_url,
      signatureEnabled: p.signature_enabled === true,
    },
    year,
    availableYears,
    entries: entries.sort((a, b) =>
      (b.completedAt ?? b.assignedAt ?? "").localeCompare(
        a.completedAt ?? a.assignedAt ?? "",
      ),
    ),
    live: {
      classCount: liveCount,
      totalMinutes: liveTotal,
      speakingMinutes: liveSpeaking,
      listeningMinutes: liveListening,
      otherMinutes: liveOther,
    },
    stats: {
      selfAssigned,
      selfCompleted,
      totalXp,
      estimatedMinutes,
      byMonth: Array.from(byMonthMap.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    },
    generatedAt: new Date().toISOString(),
  };
}
