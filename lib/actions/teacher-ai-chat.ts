"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TeacherAiChatRow {
  studentId: string;
  fullName: string;
  classroomName: string | null;
  messages: number;
  activeDays: number;
  messagesPerDay: number;
  firstAt: string | null;
  lastAt: string | null;
}

/**
 * Per-student AI-tutor usage summary for the signed-in teacher.
 * Scoped to conversations belonging to students in classrooms this
 * teacher owns. "activeDays" is the count of distinct calendar
 * days that student sent at least one user-role message;
 * messagesPerDay is total messages ÷ activeDays (0 when inactive).
 */
export async function getTeacherAiChatStats(): Promise<TeacherAiChatRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data: classrooms } = await admin
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", user.id);
  const classroomIds = (classrooms ?? []).map(
    (c) => (c as { id: string }).id,
  );
  if (classroomIds.length === 0) return [];
  const classroomNameById = new Map<string, string>();
  for (const c of classrooms ?? []) {
    const row = c as { id: string; name: string };
    classroomNameById.set(row.id, row.name);
  }

  // Conversations scoped to this teacher's classrooms. Student_id
  // resolves to a profile (could be a student OR a teacher exploring
  // their own AI tutor under their auth user — we show both).
  const { data: conversations } = await admin
    .from("conversations")
    .select("id, student_id, classroom_id")
    .in("classroom_id", classroomIds)
    .limit(100_000);

  const convoToStudent = new Map<string, string>();
  const convoToClassroom = new Map<string, string>();
  for (const c of (conversations ?? []) as Array<{
    id: string;
    student_id: string;
    classroom_id: string;
  }>) {
    convoToStudent.set(c.id, c.student_id);
    convoToClassroom.set(c.id, c.classroom_id);
  }
  const convoIds = [...convoToStudent.keys()];
  if (convoIds.length === 0) return [];

  const { data: messages } = await admin
    .from("messages")
    .select("conversation_id, created_at")
    .in("conversation_id", convoIds)
    .eq("role", "user")
    .limit(500_000);

  const msgCount = new Map<string, number>();
  const activeDays = new Map<string, Set<string>>();
  const firstAt = new Map<string, string>();
  const lastAt = new Map<string, string>();
  const classroomByStudent = new Map<string, string>();
  for (const m of (messages ?? []) as Array<{
    conversation_id: string;
    created_at: string;
  }>) {
    const studentId = convoToStudent.get(m.conversation_id);
    if (!studentId) continue;
    msgCount.set(studentId, (msgCount.get(studentId) ?? 0) + 1);
    let days = activeDays.get(studentId);
    if (!days) {
      days = new Set();
      activeDays.set(studentId, days);
    }
    days.add(m.created_at.slice(0, 10));
    if (!firstAt.has(studentId) || m.created_at < firstAt.get(studentId)!) {
      firstAt.set(studentId, m.created_at);
    }
    if (!lastAt.has(studentId) || m.created_at > lastAt.get(studentId)!) {
      lastAt.set(studentId, m.created_at);
    }
    const cid = convoToClassroom.get(m.conversation_id);
    if (cid && !classroomByStudent.has(studentId)) {
      classroomByStudent.set(studentId, cid);
    }
  }

  const studentIds = [...msgCount.keys()];
  if (studentIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", studentIds);

  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{ id: string; full_name: string }>) {
    nameById.set(p.id, p.full_name);
  }

  return studentIds
    .map((sid) => {
      const messages = msgCount.get(sid) ?? 0;
      const days = activeDays.get(sid)?.size ?? 0;
      const classroomId = classroomByStudent.get(sid);
      return {
        studentId: sid,
        fullName: nameById.get(sid) ?? "Unknown",
        classroomName: classroomId
          ? classroomNameById.get(classroomId) ?? null
          : null,
        messages,
        activeDays: days,
        messagesPerDay: days > 0 ? Math.round((messages / days) * 10) / 10 : 0,
        firstAt: firstAt.get(sid) ?? null,
        lastAt: lastAt.get(sid) ?? null,
      };
    })
    .sort((a, b) => b.messages - a.messages);
}
