"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SpeakingStatsRow {
  studentId: string;
  fullName: string;
  classroomName: string | null;
  totalEvents: number;
  totalSeconds: number;
  activeDays: number;
  eventsPerDay: number;
  firstAt: string | null;
  lastAt: string | null;
}

/** Client calls this right after uploading a recording. Start is
 *  when the user clicked Mic, duration is the elapsed ms. Silently
 *  no-ops when the student isn't signed in or the insert fails. */
export async function logSpeakingEvent(input: {
  durationMs: number;
  context?: string | null;
  startedAtIso?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not signed in" };
  const dur = Math.max(0, Math.floor(Number(input.durationMs) || 0));
  const payload = {
    student_id: user.id,
    duration_ms: dur,
    context: (input.context ?? "").trim() || null,
    started_at: input.startedAtIso ?? new Date().toISOString(),
  };
  const { error } = await supabase.from("speaking_events").insert(payload);
  if (error) return { error: error.message };
  return { success: true };
}

async function aggregate(
  userIds: string[],
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, {
  total: number;
  durationMs: number;
  days: Set<string>;
  firstAt: string | null;
  lastAt: string | null;
}>> {
  const out = new Map<
    string,
    {
      total: number;
      durationMs: number;
      days: Set<string>;
      firstAt: string | null;
      lastAt: string | null;
    }
  >();
  if (userIds.length === 0) return out;
  const { data } = await admin
    .from("speaking_events")
    .select("student_id, started_at, duration_ms")
    .in("student_id", userIds)
    .limit(200_000);
  for (const row of (data ?? []) as Array<{
    student_id: string;
    started_at: string;
    duration_ms: number | null;
  }>) {
    let bucket = out.get(row.student_id);
    if (!bucket) {
      bucket = {
        total: 0,
        durationMs: 0,
        days: new Set(),
        firstAt: null,
        lastAt: null,
      };
      out.set(row.student_id, bucket);
    }
    bucket.total += 1;
    bucket.durationMs += row.duration_ms ?? 0;
    bucket.days.add(row.started_at.slice(0, 10));
    if (!bucket.firstAt || row.started_at < bucket.firstAt) {
      bucket.firstAt = row.started_at;
    }
    if (!bucket.lastAt || row.started_at > bucket.lastAt) {
      bucket.lastAt = row.started_at;
    }
  }
  return out;
}

/** Per-student speaking-lab usage for the signed-in teacher. */
export async function getTeacherSpeakingStats(): Promise<SpeakingStatsRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const [classroomsRes, rosterRes] = await Promise.all([
    admin
      .from("classrooms")
      .select("id, name")
      .eq("teacher_id", user.id)
      .is("deleted_at", null),
    admin
      .from("roster_students")
      .select("auth_user_id")
      .eq("teacher_id", user.id)
      .is("deleted_at", null)
      .not("auth_user_id", "is", null),
  ]);

  const classrooms = (classroomsRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const classroomIds = classrooms.map((c) => c.id);
  const classroomNameById = new Map<string, string>();
  for (const c of classrooms) classroomNameById.set(c.id, c.name);

  const rosterUserIds = ((rosterRes.data ?? []) as Array<{
    auth_user_id: string | null;
  }>)
    .map((r) => r.auth_user_id)
    .filter((x): x is string => !!x);

  let memberUserIds: string[] = [];
  if (classroomIds.length > 0) {
    const { data: members } = await admin
      .from("classroom_members")
      .select("student_id, classroom_id")
      .in("classroom_id", classroomIds);
    memberUserIds = ((members ?? []) as Array<{ student_id: string }>).map(
      (m) => m.student_id,
    );
  }

  const scopedUserIds = Array.from(
    new Set<string>([...rosterUserIds, ...memberUserIds]),
  );
  if (scopedUserIds.length === 0) return [];

  const aggMap = await aggregate(scopedUserIds, admin);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", scopedUserIds);
  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{
    id: string;
    full_name: string;
  }>) {
    nameById.set(p.id, p.full_name);
  }

  const classroomByStudent = new Map<string, string>();
  if (classroomIds.length > 0) {
    const { data: members } = await admin
      .from("classroom_members")
      .select("student_id, classroom_id")
      .in("classroom_id", classroomIds);
    for (const m of (members ?? []) as Array<{
      student_id: string;
      classroom_id: string;
    }>) {
      if (!classroomByStudent.has(m.student_id))
        classroomByStudent.set(m.student_id, m.classroom_id);
    }
  }

  const rows: SpeakingStatsRow[] = [];
  for (const sid of scopedUserIds) {
    const bucket = aggMap.get(sid);
    if (!bucket) continue; // skip students with zero activity
    const days = bucket.days.size;
    const seconds = Math.round(bucket.durationMs / 1000);
    rows.push({
      studentId: sid,
      fullName: nameById.get(sid) ?? "Unknown",
      classroomName:
        classroomNameById.get(classroomByStudent.get(sid) ?? "") ?? null,
      totalEvents: bucket.total,
      totalSeconds: seconds,
      activeDays: days,
      eventsPerDay:
        days > 0 ? Math.round((bucket.total / days) * 10) / 10 : 0,
      firstAt: bucket.firstAt,
      lastAt: bucket.lastAt,
    });
  }

  rows.sort((a, b) => b.totalEvents - a.totalEvents);
  return rows;
}

/** Platform-wide speaking-lab usage (sysadmin view). */
export async function getAllSpeakingStats(): Promise<SpeakingStatsRow[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .neq("role", "owner");
  const userRows = ((profiles ?? []) as Array<{
    id: string;
    full_name: string;
    role: string;
  }>)
    .filter((p) => p.role === "student" || p.role === "teacher");

  const ids = userRows.map((p) => p.id);
  if (ids.length === 0) return [];

  const aggMap = await aggregate(ids, admin);
  const rows: SpeakingStatsRow[] = [];
  for (const p of userRows) {
    const bucket = aggMap.get(p.id);
    if (!bucket) continue;
    const days = bucket.days.size;
    const seconds = Math.round(bucket.durationMs / 1000);
    rows.push({
      studentId: p.id,
      fullName: p.full_name,
      classroomName: null,
      totalEvents: bucket.total,
      totalSeconds: seconds,
      activeDays: days,
      eventsPerDay:
        days > 0 ? Math.round((bucket.total / days) * 10) / 10 : 0,
      firstAt: bucket.firstAt,
      lastAt: bucket.lastAt,
    });
  }
  rows.sort((a, b) => b.totalEvents - a.totalEvents);
  return rows;
}
