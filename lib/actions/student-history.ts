"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  HISTORY_STATUSES,
  SKILL_FOCUS_OPTIONS,
  type HistoryStatus,
  type SkillFocus,
  type StudentHistoryEntry,
} from "./student-history-types";

interface SaveHistoryInput {
  id?: string;
  student_id?: string | null;
  roster_student_id?: string | null;
  classroom_id?: string | null;
  event_date: string;
  event_time?: string | null;
  status: string;
  lesson_content?: string | null;
  skill_focus?: string[];
  meeting_link?: string | null;
}

function sanitizeSkillFocus(list: string[] | undefined): SkillFocus[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<SkillFocus>();
  for (const s of list) {
    const match = SKILL_FOCUS_OPTIONS.find((x) => x === s);
    if (match) seen.add(match);
  }
  return Array.from(seen);
}

export async function saveHistoryEntry(
  input: SaveHistoryInput,
): Promise<{ id: string } | { error: string }> {
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
  if (profile?.role !== "teacher") return { error: "Teachers only" };

  if (!input.event_date) return { error: "Date is required" };
  if (!HISTORY_STATUSES.includes(input.status as HistoryStatus)) {
    return { error: "Invalid status" };
  }
  const hasStudent = Boolean(input.student_id);
  const hasRoster = Boolean(input.roster_student_id);
  if (hasStudent === hasRoster) {
    return { error: "Must target exactly one student (auth or roster)" };
  }

  const payload = {
    teacher_id: user.id,
    student_id: hasStudent ? input.student_id : null,
    roster_student_id: hasRoster ? input.roster_student_id : null,
    classroom_id: input.classroom_id ?? null,
    event_date: input.event_date,
    event_time: input.event_time || null,
    status: input.status,
    lesson_content: input.lesson_content?.trim() || null,
    skill_focus: sanitizeSkillFocus(input.skill_focus),
    meeting_link: input.meeting_link?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await admin
      .from("student_history")
      .update(payload)
      .eq("id", input.id)
      .eq("teacher_id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: error?.message ?? "Update failed" };
    return { id: data.id as string };
  }
  const { data, error } = await admin
    .from("student_history")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };
  return { id: data.id as string };
}

export async function deleteHistoryEntry(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("student_history")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) return { error: error.message };
  return { success: true as const };
}

interface ListArgs {
  studentId?: string;
  rosterStudentId?: string;
}

export async function listStudentHistory(
  args: ListArgs,
): Promise<StudentHistoryEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  let query = admin
    .from("student_history")
    .select(
      "id, teacher_id, student_id, roster_student_id, classroom_id, event_date, event_time, status, lesson_content, skill_focus, meeting_link, created_at, updated_at",
    )
    .eq("teacher_id", user.id)
    .order("event_date", { ascending: false })
    .order("event_time", { ascending: false, nullsFirst: false });

  if (args.studentId) query = query.eq("student_id", args.studentId);
  else if (args.rosterStudentId)
    query = query.eq("roster_student_id", args.rosterStudentId);
  else return [];

  // Defensive: survive the table not existing yet (pre-migration build).
  let data: Array<Record<string, unknown>> | null = null;
  try {
    const res = await query;
    if (!res.error) data = res.data as Array<Record<string, unknown>> | null;
  } catch {
    data = null;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    teacher_id: r.teacher_id as string,
    student_id: (r.student_id as string | null) ?? null,
    roster_student_id: (r.roster_student_id as string | null) ?? null,
    classroom_id: (r.classroom_id as string | null) ?? null,
    event_date: r.event_date as string,
    event_time: (r.event_time as string | null) ?? null,
    status: r.status as HistoryStatus,
    lesson_content: (r.lesson_content as string | null) ?? null,
    skill_focus: Array.isArray(r.skill_focus)
      ? sanitizeSkillFocus(r.skill_focus as string[])
      : [],
    meeting_link: (r.meeting_link as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

/**
 * List every history row the teacher owns, newest first. Used by the
 * dashboard class log so adding/editing anywhere (profile or dashboard)
 * flows into the same table.
 */
export async function listAllTeacherHistory(
  limit = 50,
): Promise<
  (StudentHistoryEntry & { student_name: string | null })[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  // Defensive: if migration 023 hasn't been applied yet, the query fails
  // and the build can't collect page data for /teacher. Swallow errors
  // so the dashboard still renders with an empty log.
  let rows: Array<Record<string, unknown>> = [];
  try {
    const { data, error } = await admin
      .from("student_history")
      .select(
        "id, teacher_id, student_id, roster_student_id, classroom_id, event_date, event_time, status, lesson_content, skill_focus, meeting_link, created_at, updated_at",
      )
      .eq("teacher_id", user.id)
      .order("event_date", { ascending: false })
      .order("event_time", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (!error && data) rows = data as Array<Record<string, unknown>>;
  } catch {
    rows = [];
  }
  if (rows.length === 0) return [];

  // Resolve display names from profiles (auth students) + roster_students.
  const authIds = Array.from(
    new Set(rows.map((r) => r.student_id as string | null).filter(Boolean)),
  ) as string[];
  const rosterIds = Array.from(
    new Set(rows.map((r) => r.roster_student_id as string | null).filter(Boolean)),
  ) as string[];
  const nameById = new Map<string, string>();
  if (authIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authIds);
    for (const p of profs ?? []) {
      nameById.set(p.id as string, (p.full_name as string | null) ?? "");
    }
  }
  if (rosterIds.length > 0) {
    const { data: rstr } = await admin
      .from("roster_students")
      .select("id, full_name")
      .in("id", rosterIds);
    for (const r of rstr ?? []) {
      nameById.set(r.id as string, (r.full_name as string | null) ?? "");
    }
  }

  return rows.map((r) => ({
    id: r.id as string,
    teacher_id: r.teacher_id as string,
    student_id: (r.student_id as string | null) ?? null,
    roster_student_id: (r.roster_student_id as string | null) ?? null,
    classroom_id: (r.classroom_id as string | null) ?? null,
    event_date: r.event_date as string,
    event_time: (r.event_time as string | null) ?? null,
    status: r.status as HistoryStatus,
    lesson_content: (r.lesson_content as string | null) ?? null,
    skill_focus: Array.isArray(r.skill_focus)
      ? sanitizeSkillFocus(r.skill_focus as string[])
      : [],
    meeting_link: (r.meeting_link as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    student_name:
      nameById.get((r.student_id as string) ?? "") ||
      nameById.get((r.roster_student_id as string) ?? "") ||
      null,
  }));
}

export interface ScheduleClassInput {
  student_id?: string;
  roster_student_id?: string;
  classroom_id?: string | null;
  event_date: string;
  event_time?: string | null;
  meeting_link?: string | null;
  skill_focus?: string[];
  lesson_content?: string | null;
}

/**
 * Schedule a future class. Creates a history row with status='Planned'.
 */
export async function scheduleClass(
  input: ScheduleClassInput,
): Promise<{ id: string } | { error: string }> {
  return saveHistoryEntry({
    student_id: input.student_id ?? null,
    roster_student_id: input.roster_student_id ?? null,
    classroom_id: input.classroom_id ?? null,
    event_date: input.event_date,
    event_time: input.event_time ?? null,
    status: "Planned",
    lesson_content: input.lesson_content ?? null,
    skill_focus: input.skill_focus ?? [],
    meeting_link: input.meeting_link ?? null,
  });
}

export interface ScheduleClassroomClassInput {
  classroom_id: string;
  event_date: string;
  event_time?: string | null;
  meeting_link?: string | null;
  skill_focus?: string[];
  lesson_content?: string | null;
}

/**
 * Schedule a class for every student in a classroom. Creates one
 * 'Planned' history row per roster student in that classroom so each
 * student sees the session in their own history.
 */
export async function scheduleClassroomClass(
  input: ScheduleClassroomClassInput,
): Promise<{ created: number } | { error: string }> {
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
  if (profile?.role !== "teacher") return { error: "Teachers only" };

  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, teacher_id")
    .eq("id", input.classroom_id)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!classroom) return { error: "Classroom not found" };

  const { data: rosterRows } = await admin
    .from("roster_students")
    .select("id")
    .eq("classroom_id", input.classroom_id)
    .eq("teacher_id", user.id);
  const rosterIds = (rosterRows ?? []).map((r) => r.id as string);
  if (rosterIds.length === 0) return { error: "No students in this classroom" };

  const now = new Date().toISOString();
  const rows = rosterIds.map((rid) => ({
    teacher_id: user.id,
    student_id: null,
    roster_student_id: rid,
    classroom_id: input.classroom_id,
    event_date: input.event_date,
    event_time: input.event_time || null,
    status: "Planned",
    lesson_content: input.lesson_content?.trim() || null,
    skill_focus: sanitizeSkillFocus(input.skill_focus),
    meeting_link: input.meeting_link?.trim() || null,
    updated_at: now,
  }));

  try {
    const { error } = await admin.from("student_history").insert(rows);
    if (error) return { error: error.message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Insert failed" };
  }
  return { created: rows.length };
}
