"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvatarSignedUrls } from "@/lib/supabase/signed-urls";
import { getRosterAvatarSignedUrls } from "@/lib/actions/roster";
import { computeStreak } from "@/lib/gamification/engine";
import type { StudentRow } from "@/components/teacher/student-grid";

type MemberRow = {
  classroom_id: string;
  student_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export async function getClassroomStudentRows(
  classroomId: string
): Promise<StudentRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const [membersRes, rosterRes] = await Promise.all([
    admin
      .from("classroom_members")
      .select("classroom_id, student_id, profiles(full_name, avatar_url)")
      .eq("classroom_id", classroomId),
    admin
      .from("roster_students")
      .select("id, full_name, has_avatar, classroom_id, age_group, gender")
      .eq("classroom_id", classroomId)
      .eq("teacher_id", user.id),
  ]);

  const authRows = (membersRes.data as unknown as MemberRow[] | null) ?? [];
  const rosterRows = rosterRes.data ?? [];

  const authStudents = authRows.length > 0
    ? await buildStudentRows(authRows, [classroomId], supabase, admin)
    : [];

  const rosterIds = rosterRows
    .filter((r) => (r as { has_avatar: boolean }).has_avatar)
    .map((r) => r.id as string);
  const rosterSignedUrls = await getRosterAvatarSignedUrls(rosterIds);

  const rosterStudents: StudentRow[] = rosterRows.map((r) => ({
    classroomId,
    studentId: r.id as string,
    fullName: r.full_name as string,
    totalXp: 0,
    streak: 0,
    assigned: 0,
    completed: 0,
    lastActivity: null,
    avatarUrl: rosterSignedUrls[r.id as string] ?? null,
    isRoster: true,
    ageGroup: (r as { age_group: "kid" | "teen" | "adult" | null }).age_group ?? null,
    gender: (r as { gender: "female" | "male" | null }).gender ?? null,
  }));

  return [...authStudents, ...rosterStudents];
}

export interface ClassroomSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  studentCount: number;
}

export interface RosterSummary {
  id: string;
  fullName: string;
  classroomId: string | null;
  classroomName: string | null;
  hasAvatar: boolean;
  avatarUrl: string | null;
  ageGroup: "kid" | "teen" | "adult" | null;
  gender: "female" | "male" | null;
}

export interface RecentAssignmentRow {
  assignmentId: string;
  lessonSlug: string;
  status: "assigned" | "skipped" | "completed";
  assignedAt: string;
  classroomId: string;
  classroomName: string;
  scope: "classroom-wide" | "per-student";
  targetStudentId: string | null;
  targetStudentName: string | null;
}

export interface TeacherOverview {
  classrooms: ClassroomSummary[];
  roster: RosterSummary[];
  kpis: {
    students: number;
    lessonsAssigned: number;
    lessonsCompleted: number;
  };
  recentAssignments: RecentAssignmentRow[];
}

export interface TeacherDashboardKpis {
  totalStudents: number;
  activeToday: number;
  lessonsThisWeek: number;
  xpThisWeek: number;
  avgStreak: number;
  totalClassrooms: number;
}

export interface TeacherDashboardData {
  kpis: TeacherDashboardKpis;
  classrooms: ClassroomSummary[];
  students: StudentRow[];
}

async function buildStudentRows(
  members: MemberRow[],
  classroomIds: string[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>
): Promise<StudentRow[]> {
  if (members.length === 0) return [];
  const studentIds = Array.from(new Set(members.map((m) => m.student_id)));

  const [xpRes, progressRes, assignRes, activityRes] = await Promise.all([
    admin
      .from("xp_events")
      .select("student_id, classroom_id, xp_amount")
      .in("classroom_id", classroomIds),
    admin
      .from("lesson_progress")
      .select("student_id, classroom_id, completed_at, started_at")
      .in("classroom_id", classroomIds),
    admin
      .from("lesson_assignments")
      .select("student_id, classroom_id, status")
      .in("classroom_id", classroomIds),
    admin
      .from("daily_activity")
      .select("student_id, activity_date")
      .in("student_id", studentIds)
      .order("activity_date", { ascending: false })
      .limit(studentIds.length * 60),
  ]);

  const xpByPair = new Map<string, number>();
  for (const row of xpRes.data ?? []) {
    const key = `${row.classroom_id}:${row.student_id}`;
    xpByPair.set(key, (xpByPair.get(key) ?? 0) + (row.xp_amount as number));
  }

  const completedByPair = new Map<string, number>();
  const lastActivityByStudent = new Map<string, string>();
  for (const p of progressRes.data ?? []) {
    const sid = p.student_id as string;
    const cid = p.classroom_id as string;
    const key = `${cid}:${sid}`;
    if (p.completed_at) {
      completedByPair.set(key, (completedByPair.get(key) ?? 0) + 1);
      const prev = lastActivityByStudent.get(sid);
      const ts = p.completed_at as string;
      if (!prev || ts > prev) lastActivityByStudent.set(sid, ts);
    } else if (p.started_at) {
      const prev = lastActivityByStudent.get(sid);
      const ts = p.started_at as string;
      if (!prev || ts > prev) lastActivityByStudent.set(sid, ts);
    }
  }

  const classroomWideByClassroom = new Map<string, number>();
  const perStudentAssigned = new Map<string, number>();
  for (const a of assignRes.data ?? []) {
    const cid = a.classroom_id as string;
    const sid = (a as { student_id: string | null }).student_id;
    if (sid === null) {
      classroomWideByClassroom.set(
        cid,
        (classroomWideByClassroom.get(cid) ?? 0) + 1
      );
    } else {
      const key = `${cid}:${sid}`;
      perStudentAssigned.set(key, (perStudentAssigned.get(key) ?? 0) + 1);
    }
  }

  const activitiesByStudent = new Map<string, { activity_date: string }[]>();
  for (const a of activityRes.data ?? []) {
    const sid = a.student_id as string;
    const list = activitiesByStudent.get(sid) ?? [];
    list.push({ activity_date: a.activity_date as string });
    activitiesByStudent.set(sid, list);
  }

  const signedUrls = await getAvatarSignedUrls(supabase, studentIds);

  return members.map((m) => {
    const sid = m.student_id;
    const cid = m.classroom_id;
    const pairKey = `${cid}:${sid}`;
    const assigned =
      (classroomWideByClassroom.get(cid) ?? 0) +
      (perStudentAssigned.get(pairKey) ?? 0);
    const completed = completedByPair.get(pairKey) ?? 0;
    const streak = computeStreak(activitiesByStudent.get(sid) ?? []);
    return {
      classroomId: cid,
      studentId: sid,
      fullName: m.profiles?.full_name ?? "Unknown",
      totalXp: xpByPair.get(pairKey) ?? 0,
      streak,
      assigned,
      completed,
      lastActivity: lastActivityByStudent.get(sid) ?? null,
      avatarUrl: m.profiles?.avatar_url ? signedUrls[sid] ?? null : null,
    };
  });
}

export async function getTeacherDashboardData(): Promise<TeacherDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return emptyData();
  }

  const admin = createAdminClient();

  const { data: classrooms } = await admin
    .from("classrooms")
    .select("id, name, description, invite_code")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const rows = classrooms ?? [];
  if (rows.length === 0) return emptyData();

  const classroomIds = rows.map((c) => c.id as string);

  const { data: members } = await admin
    .from("classroom_members")
    .select("classroom_id, student_id, profiles(full_name, avatar_url)")
    .in("classroom_id", classroomIds);
  const memberRows = (members as unknown as MemberRow[] | null) ?? [];

  const classroomSummaries: ClassroomSummary[] = rows.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: (c as { description: string | null }).description,
    inviteCode: c.invite_code as string,
    studentCount: memberRows.filter((m) => m.classroom_id === c.id).length,
  }));

  const students = await buildStudentRows(memberRows, classroomIds, supabase, admin);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [dailyRes, weeklyLessonsRes, weeklyXpRes] = await Promise.all([
    admin
      .from("daily_activity")
      .select("student_id")
      .in(
        "student_id",
        memberRows.map((m) => m.student_id)
      )
      .eq("activity_date", today),
    admin
      .from("lesson_progress")
      .select("student_id")
      .in("classroom_id", classroomIds)
      .gte("completed_at", `${weekAgo}T00:00:00`),
    admin
      .from("xp_events")
      .select("xp_amount")
      .in("classroom_id", classroomIds)
      .gte("created_at", `${weekAgo}T00:00:00`),
  ]);

  const activeTodayIds = new Set((dailyRes.data ?? []).map((r) => r.student_id as string));
  const lessonsThisWeek = (weeklyLessonsRes.data ?? []).length;
  const xpThisWeek = (weeklyXpRes.data ?? []).reduce(
    (s, r) => s + (r.xp_amount as number),
    0
  );

  const streaks = students.map((s) => s.streak);
  const avgStreak =
    streaks.length > 0
      ? streaks.reduce((a, b) => a + b, 0) / streaks.length
      : 0;

  const totalStudents = new Set(memberRows.map((m) => m.student_id)).size;

  return {
    kpis: {
      totalStudents,
      activeToday: activeTodayIds.size,
      lessonsThisWeek,
      xpThisWeek,
      avgStreak: Math.round(avgStreak * 10) / 10,
      totalClassrooms: classroomSummaries.length,
    },
    classrooms: classroomSummaries,
    students,
  };
}

function emptyData(): TeacherDashboardData {
  return {
    kpis: {
      totalStudents: 0,
      activeToday: 0,
      lessonsThisWeek: 0,
      xpThisWeek: 0,
      avgStreak: 0,
      totalClassrooms: 0,
    },
    classrooms: [],
    students: [],
  };
}

export async function getTeacherOverview(): Promise<TeacherOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const zeroKpis = { students: 0, lessonsAssigned: 0, lessonsCompleted: 0 };
  if (!user)
    return { classrooms: [], roster: [], kpis: zeroKpis, recentAssignments: [] };

  const admin = createAdminClient();

  const [classroomsRes, rosterRes] = await Promise.all([
    admin
      .from("classrooms")
      .select("id, name, description, invite_code")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("roster_students")
      .select("id, full_name, classroom_id, has_avatar, age_group, gender")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .then((res) => (res.error ? { data: [], error: null } : res)),
  ]);

  const classroomRows = classroomsRes.data ?? [];
  const rosterRows = rosterRes.data ?? [];

  const classroomIds = classroomRows.map((c) => c.id as string);
  const memberCounts = new Map<string, number>();
  if (classroomIds.length > 0) {
    const { data: members } = await admin
      .from("classroom_members")
      .select("classroom_id")
      .in("classroom_id", classroomIds);
    for (const m of members ?? []) {
      const cid = m.classroom_id as string;
      memberCounts.set(cid, (memberCounts.get(cid) ?? 0) + 1);
    }
  }

  const rosterCountsByClassroom = new Map<string, number>();
  for (const r of rosterRows) {
    const cid = (r as { classroom_id: string | null }).classroom_id;
    if (cid) rosterCountsByClassroom.set(cid, (rosterCountsByClassroom.get(cid) ?? 0) + 1);
  }

  const classrooms: ClassroomSummary[] = classroomRows.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: (c as { description: string | null }).description,
    inviteCode: c.invite_code as string,
    studentCount:
      (memberCounts.get(c.id as string) ?? 0) +
      (rosterCountsByClassroom.get(c.id as string) ?? 0),
  }));

  const rosterWithAvatars = rosterRows.filter(
    (r) => (r as { has_avatar: boolean }).has_avatar
  );
  const signedUrls = await getRosterAvatarSignedUrls(
    rosterWithAvatars.map((r) => r.id as string)
  );

  const classroomNameById = new Map(classrooms.map((c) => [c.id, c.name]));
  const roster: RosterSummary[] = rosterRows.map((r) => ({
    id: r.id as string,
    fullName: r.full_name as string,
    classroomId: (r as { classroom_id: string | null }).classroom_id,
    classroomName: (r as { classroom_id: string | null }).classroom_id
      ? classroomNameById.get(
          (r as { classroom_id: string }).classroom_id
        ) ?? null
      : null,
    hasAvatar: (r as { has_avatar: boolean }).has_avatar,
    avatarUrl: signedUrls[r.id as string] ?? null,
    ageGroup:
      (r as { age_group: "kid" | "teen" | "adult" | null }).age_group ?? null,
    gender: (r as { gender: "female" | "male" | null }).gender ?? null,
  }));

  const totalStudents =
    classrooms.reduce((s, c) => s + c.studentCount, 0) +
    roster.filter((r) => !r.classroomId).length;

  let lessonsAssigned = 0;
  let lessonsCompleted = 0;
  if (classroomIds.length > 0) {
    const [assignRes, completedRes] = await Promise.all([
      admin
        .from("lesson_assignments")
        .select("classroom_id, student_id, roster_student_id")
        .in("classroom_id", classroomIds),
      admin
        .from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .in("classroom_id", classroomIds)
        .not("completed_at", "is", null),
    ]);

    // Count (student × lesson) pairs, not rows:
    //   classroom-wide (both student_id AND roster_student_id NULL) → N students
    //   per-auth-student (student_id set)                           → 1
    //   per-roster-student (roster_student_id set)                  → 1
    const rosterCountsByClassroom = new Map<string, number>();
    for (const r of rosterRows) {
      const cid = (r as { classroom_id: string | null }).classroom_id;
      if (cid) rosterCountsByClassroom.set(cid, (rosterCountsByClassroom.get(cid) ?? 0) + 1);
    }

    for (const a of assignRes.data ?? []) {
      const cid = a.classroom_id as string;
      const sid = (a as { student_id: string | null }).student_id;
      const rid = (a as { roster_student_id: string | null }).roster_student_id;
      if (sid === null && rid === null) {
        // Classroom-wide: count everyone in that classroom.
        const authHere = memberCounts.get(cid) ?? 0;
        const rosterHere = rosterCountsByClassroom.get(cid) ?? 0;
        lessonsAssigned += authHere + rosterHere;
      } else {
        // Targeted assignment — exactly one student receives it.
        lessonsAssigned += 1;
      }
    }

    lessonsCompleted = completedRes.count ?? 0;
  }

  let recentAssignments: RecentAssignmentRow[] = [];
  if (classroomIds.length > 0) {
    const { data: recentRows } = await admin
      .from("lesson_assignments")
      .select(
        "id, lesson_slug, status, assigned_at, classroom_id, student_id, roster_student_id"
      )
      .in("classroom_id", classroomIds)
      .order("assigned_at", { ascending: false })
      .limit(8);

    const authStudentIds = Array.from(
      new Set(
        (recentRows ?? [])
          .map((r) => (r as { student_id: string | null }).student_id)
          .filter((x): x is string => !!x)
      )
    );
    const rosterIdSet = Array.from(
      new Set(
        (recentRows ?? [])
          .map(
            (r) => (r as { roster_student_id: string | null }).roster_student_id
          )
          .filter((x): x is string => !!x)
      )
    );

    const [authProfiles, rosterNames] = await Promise.all([
      authStudentIds.length > 0
        ? admin
            .from("profiles")
            .select("id, full_name")
            .in("id", authStudentIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      rosterIdSet.length > 0
        ? admin
            .from("roster_students")
            .select("id, full_name")
            .in("id", rosterIdSet)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);
    const authNameById = new Map(
      (authProfiles.data ?? []).map((p) => [p.id, p.full_name])
    );
    const rosterNameById = new Map(
      (rosterNames.data ?? []).map((p) => [p.id, p.full_name])
    );

    recentAssignments = (recentRows ?? []).map((a) => {
      const cid = a.classroom_id as string;
      const sid = (a as { student_id: string | null }).student_id;
      const rid = (a as { roster_student_id: string | null }).roster_student_id;
      const scope: "classroom-wide" | "per-student" =
        sid === null && rid === null ? "classroom-wide" : "per-student";
      const targetId = sid ?? rid ?? null;
      const targetName = sid
        ? authNameById.get(sid) ?? null
        : rid
          ? rosterNameById.get(rid) ?? null
          : null;
      return {
        assignmentId: a.id as string,
        lessonSlug: a.lesson_slug as string,
        status: a.status as "assigned" | "skipped" | "completed",
        assignedAt: a.assigned_at as string,
        classroomId: cid,
        classroomName: classroomNameById.get(cid) ?? "",
        scope,
        targetStudentId: targetId,
        targetStudentName: targetName,
      };
    });
  }

  return {
    classrooms,
    roster,
    kpis: {
      students: totalStudents,
      lessonsAssigned,
      lessonsCompleted,
    },
    recentAssignments,
  };
}
