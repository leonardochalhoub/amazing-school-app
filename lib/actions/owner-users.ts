"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

export interface UserRow {
  id: string;
  full_name: string;
  role: "teacher" | "student";
  avatar_url: string | null;
  created_at: string;
  email: string | null;
  // teacher-only
  classroomCount?: number;
  studentCount?: number;
  // student-only
  totalXp?: number;
  lastActivity?: string | null;
  teacherName?: string | null;
}

export async function listAllUsers(): Promise<UserRow[] | { error: string }> {
  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  // Profiles + auth emails
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, avatar_url, created_at")
    .order("created_at", { ascending: false });
  const profs = (profiles ?? []) as Array<{
    id: string;
    full_name: string;
    role: "teacher" | "student";
    avatar_url: string | null;
    created_at: string;
  }>;

  // Emails via auth admin API (service-role key grants this).
  const { data: authData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailById = new Map<string, string>();
  for (const u of authData?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  // Teacher stats.
  const teacherIds = profs.filter((p) => p.role === "teacher").map((p) => p.id);
  const teacherStats = new Map<
    string,
    { classroomCount: number; studentCount: number }
  >();
  if (teacherIds.length > 0) {
    const { data: classrooms } = await admin
      .from("classrooms")
      .select("id, teacher_id")
      .in("teacher_id", teacherIds);
    const classroomByTeacher = new Map<string, string[]>();
    for (const c of (classrooms ?? []) as Array<{
      id: string;
      teacher_id: string;
    }>) {
      const arr = classroomByTeacher.get(c.teacher_id) ?? [];
      arr.push(c.id);
      classroomByTeacher.set(c.teacher_id, arr);
    }
    const allClassroomIds = [...classroomByTeacher.values()].flat();
    const { data: members } = allClassroomIds.length
      ? await admin
          .from("classroom_members")
          .select("classroom_id")
          .in("classroom_id", allClassroomIds)
      : { data: [] };
    const studentsByClassroom = new Map<string, number>();
    for (const m of (members ?? []) as Array<{ classroom_id: string }>) {
      studentsByClassroom.set(
        m.classroom_id,
        (studentsByClassroom.get(m.classroom_id) ?? 0) + 1
      );
    }
    for (const t of teacherIds) {
      const cids = classroomByTeacher.get(t) ?? [];
      const students = cids.reduce(
        (sum, id) => sum + (studentsByClassroom.get(id) ?? 0),
        0
      );
      teacherStats.set(t, {
        classroomCount: cids.length,
        studentCount: students,
      });
    }
  }

  // Student stats.
  const studentIds = profs.filter((p) => p.role === "student").map((p) => p.id);
  const xpByStudent = new Map<string, number>();
  const lastActivityByStudent = new Map<string, string>();
  const teacherNameByStudent = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: xps } = await admin
      .from("xp_events")
      .select("student_id, xp_amount")
      .in("student_id", studentIds)
      .limit(50_000);
    for (const x of (xps ?? []) as Array<{
      student_id: string;
      xp_amount: number;
    }>) {
      xpByStudent.set(
        x.student_id,
        (xpByStudent.get(x.student_id) ?? 0) + (x.xp_amount ?? 0)
      );
    }
    const { data: acts } = await admin
      .from("daily_activity")
      .select("student_id, activity_date")
      .in("student_id", studentIds)
      .order("activity_date", { ascending: false })
      .limit(50_000);
    for (const a of (acts ?? []) as Array<{
      student_id: string;
      activity_date: string;
    }>) {
      if (!lastActivityByStudent.has(a.student_id)) {
        lastActivityByStudent.set(a.student_id, a.activity_date);
      }
    }
    // Teacher linkage via classroom_members → classrooms.teacher_id
    const { data: memberships } = await admin
      .from("classroom_members")
      .select("student_id, classroom_id, classrooms(teacher_id)")
      .in("student_id", studentIds);
    const teacherIdByStudent = new Map<string, string>();
    for (const m of (memberships ?? []) as Array<{
      student_id: string;
      classrooms:
        | { teacher_id: string }
        | { teacher_id: string }[]
        | null;
    }>) {
      const c = Array.isArray(m.classrooms) ? m.classrooms[0] : m.classrooms;
      if (c && !teacherIdByStudent.has(m.student_id)) {
        teacherIdByStudent.set(m.student_id, c.teacher_id);
      }
    }
    const needTeacherNames = [...new Set(teacherIdByStudent.values())];
    const { data: teacherProfs } = needTeacherNames.length
      ? await admin
          .from("profiles")
          .select("id, full_name")
          .in("id", needTeacherNames)
      : { data: [] };
    const teacherNameMap = new Map<string, string>();
    for (const t of (teacherProfs ?? []) as Array<{
      id: string;
      full_name: string;
    }>) {
      teacherNameMap.set(t.id, t.full_name);
    }
    for (const [sid, tid] of teacherIdByStudent) {
      const name = teacherNameMap.get(tid);
      if (name) teacherNameByStudent.set(sid, name);
    }
  }

  return profs.map((p) => {
    if (p.role === "teacher") {
      const s = teacherStats.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        email: emailById.get(p.id) ?? null,
        classroomCount: s?.classroomCount ?? 0,
        studentCount: s?.studentCount ?? 0,
      };
    }
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      email: emailById.get(p.id) ?? null,
      totalXp: xpByStudent.get(p.id) ?? 0,
      lastActivity: lastActivityByStudent.get(p.id) ?? null,
      teacherName: teacherNameByStudent.get(p.id) ?? null,
    };
  });
}
