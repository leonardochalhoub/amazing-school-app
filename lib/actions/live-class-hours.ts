"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface MonthlyMinutes {
  month: string; // "YYYY-MM"
  minutes: number;
}

export interface LiveClassSummary {
  totalMinutes: number;
  thisMonthMinutes: number;
  /** Minutes broken out per skill_focus tag — Speaking, Listening, etc. */
  bySkill: Record<string, number>;
  /** Last 12 months in chronological order, oldest first. */
  monthly: MonthlyMinutes[];
}

/**
 * Roll up duration_minutes from student_history for one roster
 * student. The DB-generated column already excludes anything
 * other than Done classes with both event_time + end_time set,
 * so the SUM is automatically clean.
 *
 * Includes per-roster rows AND classroom-wide rows for the
 * student's classroom (a class scheduled for the whole class
 * counts toward every member).
 */
export async function getLiveClassSummaryForRoster(
  rosterStudentId: string,
): Promise<LiveClassSummary> {
  const empty: LiveClassSummary = {
    totalMinutes: 0,
    thisMonthMinutes: 0,
    bySkill: {},
    monthly: [],
  };
  const admin = createAdminClient();

  const { data: roster } = await admin
    .from("roster_students")
    .select("classroom_id")
    .eq("id", rosterStudentId)
    .maybeSingle();
  const classroomId =
    (roster as { classroom_id?: string | null } | null)?.classroom_id ?? null;

  // Per-roster rows.
  const perStudentReq = admin
    .from("student_history")
    .select("event_date, duration_minutes, skill_focus")
    .eq("roster_student_id", rosterStudentId)
    .not("duration_minutes", "is", null);

  // Classroom-wide rows.
  const classroomReq = classroomId
    ? admin
        .from("student_history")
        .select("event_date, duration_minutes, skill_focus")
        .eq("classroom_id", classroomId)
        .is("roster_student_id", null)
        .not("duration_minutes", "is", null)
    : Promise.resolve({ data: [] });

  const [perRes, classRes] = await Promise.all([perStudentReq, classroomReq]);
  const rows = ([
    ...((perRes.data ?? []) as Array<{
      event_date: string;
      duration_minutes: number;
      skill_focus: string[] | null;
    }>),
    ...((classRes.data ?? []) as Array<{
      event_date: string;
      duration_minutes: number;
      skill_focus: string[] | null;
    }>),
  ]);
  if (rows.length === 0) return empty;

  let total = 0;
  const bySkill: Record<string, number> = {};
  const monthlyMap = new Map<string, number>();
  const currentMonth = new Date().toISOString().slice(0, 7);
  let thisMonth = 0;

  // Build the trailing 12-month window so months with no classes
  // still appear (chart-ready).
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }

  for (const r of rows) {
    const m = r.duration_minutes ?? 0;
    total += m;
    const month = r.event_date.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + m);
    if (month === currentMonth) thisMonth += m;
    const skills = Array.isArray(r.skill_focus) ? r.skill_focus : [];
    if (skills.length === 0) {
      bySkill["Live class"] = (bySkill["Live class"] ?? 0) + m;
    } else {
      // Distribute equally across tagged skills so a 60-min class
      // tagged "Speaking, Listening" adds 30 to each — gives an
      // honest split without double-counting.
      const each = m / skills.length;
      for (const s of skills) {
        bySkill[s] = (bySkill[s] ?? 0) + each;
      }
    }
  }

  const monthly: MonthlyMinutes[] = Array.from(monthlyMap.entries()).map(
    ([month, minutes]) => ({ month, minutes }),
  );

  // Round bySkill values to whole minutes for clean display.
  for (const k of Object.keys(bySkill)) bySkill[k] = Math.round(bySkill[k]);

  return {
    totalMinutes: total,
    thisMonthMinutes: thisMonth,
    bySkill,
    monthly,
  };
}
