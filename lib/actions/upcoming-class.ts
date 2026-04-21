"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpcomingClassDebug {
  reason: string;
  role: string;
  classroomCount: number;
  upcomingRowCount: number;
  nextFuture: string | null;
  userId: string | null;
}

export interface UpcomingClassContext {
  id: string;
  title: string;
  classroomId: string;
  classroomName: string;
  scheduledAt: string;
  meetingUrl: string;
  role: "teacher" | "student";
  counterpart: {
    teacherName?: string;
    students?: Array<{ name: string; avatarUrl: string | null }>;
    totalStudents?: number;
  };
  prepLessons: Array<{
    slug: string;
    title: string;
    cefrLevel: string | null;
  }>;
  previousNote: string | null;
}

export interface UpcomingClassResult {
  ctx: UpcomingClassContext | null;
  debug: UpcomingClassDebug;
}

export async function getMyNextClass(): Promise<UpcomingClassResult> {
  const debug: UpcomingClassDebug = {
    reason: "init",
    role: "unknown",
    classroomCount: 0,
    upcomingRowCount: 0,
    nextFuture: null,
    userId: null,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    debug.reason = "no-user";
    return { ctx: null, debug };
  }
  debug.userId = user.id;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = ((profile as { role?: string } | null)?.role ?? "student") as
    | "teacher"
    | "student"
    | "owner";
  debug.role = role;
  const isTeacher = role === "teacher" || role === "owner";

  const graceWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  let classroomIds: string[] = [];
  if (isTeacher) {
    const { data: rooms } = await admin
      .from("classrooms")
      .select("id")
      .eq("teacher_id", user.id)
      .is("deleted_at", null);
    classroomIds = ((rooms as Array<{ id: string }> | null) ?? []).map(
      (r) => r.id,
    );
  } else {
    const { data: roster } = await admin
      .from("roster_students")
      .select("classroom_id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null);
    classroomIds = (
      (roster as Array<{ classroom_id: string | null }> | null) ?? []
    )
      .map((r) => r.classroom_id)
      .filter((v): v is string => !!v);
  }
  debug.classroomCount = classroomIds.length;
  if (classroomIds.length === 0) {
    debug.reason = "no-classrooms";
    return { ctx: null, debug };
  }

  const { data: upcoming } = await admin
    .from("scheduled_classes")
    .select("id, classroom_id, title, meeting_url, scheduled_at")
    .in("classroom_id", classroomIds)
    .gte("scheduled_at", graceWindow)
    .lte("scheduled_at", windowEnd)
    .order("scheduled_at", { ascending: true })
    .limit(1);
  debug.upcomingRowCount = upcoming?.length ?? 0;

  if (!upcoming || upcoming.length === 0) {
    const { data: anyFuture } = await admin
      .from("scheduled_classes")
      .select("scheduled_at")
      .in("classroom_id", classroomIds)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1);
    debug.nextFuture =
      (anyFuture as Array<{ scheduled_at: string }> | null)?.[0]
        ?.scheduled_at ?? null;
    debug.reason = "no-rows-in-window";
    return { ctx: null, debug };
  }

  const next = upcoming[0] as {
    id: string;
    classroom_id: string;
    title: string;
    meeting_url: string;
    scheduled_at: string;
  };

  const { data: classroom } = await admin
    .from("classrooms")
    .select("name, teacher_id")
    .eq("id", next.classroom_id)
    .maybeSingle();
  const room = (classroom as {
    name: string;
    teacher_id: string;
  } | null) ?? { name: "Turma", teacher_id: "" };

  const counterpart: UpcomingClassContext["counterpart"] = {};
  if (isTeacher) {
    const { data: rosterRows } = await admin
      .from("roster_students")
      .select("full_name, has_avatar, id")
      .eq("classroom_id", next.classroom_id)
      .is("deleted_at", null);
    const rows = (rosterRows as Array<{
      full_name: string;
      has_avatar: boolean | null;
      id: string;
    }> | null) ?? [];
    counterpart.totalStudents = rows.length;
    counterpart.students = rows.slice(0, 6).map((r) => ({
      name: r.full_name,
      avatarUrl: null,
    }));
  } else {
    const { data: teacher } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", room.teacher_id)
      .maybeSingle();
    counterpart.teacherName =
      (teacher as { full_name?: string } | null)?.full_name ?? "";
  }

  const { data: assignments } = await admin
    .from("lesson_assignments")
    .select("lesson_slug, status, created_at")
    .eq("classroom_id", next.classroom_id)
    .neq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(6);
  const prepLessons = (
    (assignments as Array<{
      lesson_slug: string;
      status: string;
    }> | null) ?? []
  ).map((a) => ({
    slug: a.lesson_slug,
    title: humanizeSlug(a.lesson_slug),
    cefrLevel: null,
  }));

  const { data: prior } = await admin
    .from("scheduled_classes")
    .select("observations, scheduled_at")
    .eq("classroom_id", next.classroom_id)
    .lt("scheduled_at", new Date().toISOString())
    .not("observations", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(1);
  const previousNote =
    (prior as Array<{ observations: string | null }> | null)?.[0]
      ?.observations ?? null;

  debug.reason = "ok";
  return {
    ctx: {
      id: next.id,
      title: next.title,
      classroomId: next.classroom_id,
      classroomName: room.name,
      scheduledAt: next.scheduled_at,
      meetingUrl: next.meeting_url,
      role: isTeacher ? "teacher" : "student",
      counterpart,
      prepLessons,
      previousNote,
    },
    debug,
  };
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
