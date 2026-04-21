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
  let rosterStudentIds: string[] = []; // students we care about (teacher)
  let myRosterId: string | null = null; // student-side identity
  if (isTeacher) {
    const { data: rooms } = await admin
      .from("classrooms")
      .select("id")
      .eq("teacher_id", user.id)
      .is("deleted_at", null);
    classroomIds = ((rooms as Array<{ id: string }> | null) ?? []).map(
      (r) => r.id,
    );
    const { data: teacherRoster } = await admin
      .from("roster_students")
      .select("id")
      .eq("teacher_id", user.id)
      .is("deleted_at", null);
    rosterStudentIds = (
      (teacherRoster as Array<{ id: string }> | null) ?? []
    ).map((r) => r.id);
  } else {
    const { data: roster } = await admin
      .from("roster_students")
      .select("id, classroom_id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    const row = roster as {
      id: string;
      classroom_id: string | null;
    } | null;
    if (row) {
      myRosterId = row.id;
      if (row.classroom_id) classroomIds.push(row.classroom_id);
    }
  }
  debug.classroomCount = classroomIds.length;
  if (
    classroomIds.length === 0 &&
    rosterStudentIds.length === 0 &&
    !myRosterId
  ) {
    debug.reason = "no-classrooms";
    return { ctx: null, debug };
  }

  // Two independent sources of "upcoming classes" in this app:
  //   1. scheduled_classes — classroom-wide legacy rows with a Zoom/
  //      Meet link, `scheduled_at` timestamp.
  //   2. student_history with status='Planned' — what the Schedule
  //      class button actually writes (per-student or classroom-wide
  //      with event_date + event_time).
  // Query both and pick the nearest. Most teachers here use (2), which
  // is why the popup was always silent when looking only at (1).
  const todayISO = new Date().toISOString().slice(0, 10);
  const windowEndDateISO = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Fetch scheduled_classes via classroom list, and student_history
  // via teacher_id (teacher path) or roster_student_id (student
  // path) — the second path catches planned classes even when the
  // classroom_id is null.
  const [scheduledRes, historyRes] = await Promise.all([
    classroomIds.length > 0
      ? admin
          .from("scheduled_classes")
          .select("id, classroom_id, title, meeting_url, scheduled_at")
          .in("classroom_id", classroomIds)
          .gte("scheduled_at", graceWindow)
          .lte("scheduled_at", windowEnd)
          .order("scheduled_at", { ascending: true })
          .limit(5)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            classroom_id: string;
            title: string;
            meeting_url: string;
            scheduled_at: string;
          }>,
        }),
    (() => {
      const base = admin
        .from("student_history")
        .select(
          "id, classroom_id, roster_student_id, event_date, event_time, meeting_link, lesson_content, status, teacher_id",
        )
        .eq("status", "Planned")
        .gte("event_date", todayISO)
        .lte("event_date", windowEndDateISO)
        .order("event_date", { ascending: true })
        .limit(10);
      if (isTeacher) return base.eq("teacher_id", user.id);
      if (myRosterId) return base.eq("roster_student_id", myRosterId);
      return Promise.resolve({ data: [] });
    })(),
  ]);

  type SchedRow = {
    id: string;
    classroom_id: string;
    title: string;
    meeting_url: string;
    scheduled_at: string;
  };
  type HistRow = {
    id: string;
    classroom_id: string | null;
    roster_student_id: string | null;
    event_date: string;
    event_time: string | null;
    meeting_link: string | null;
    lesson_content: string | null;
    status: string;
  };
  const scheduled = (scheduledRes.data ?? []) as SchedRow[];
  const history = (historyRes.data ?? []) as HistRow[];

  type Merged = {
    id: string;
    classroomId: string;
    title: string;
    meetingUrl: string;
    scheduledAt: string;
  };
  const merged: Merged[] = [
    ...scheduled.map((r) => ({
      id: r.id,
      classroomId: r.classroom_id,
      title: r.title,
      meetingUrl: r.meeting_url,
      scheduledAt: r.scheduled_at,
    })),
    // Accept rows with or without a classroom_id — the Schedule class
    // flow stores the classroom_id most of the time but can be null
    // for one-off per-student sessions. classroomId falls back to ""
    // when missing; the UI hides the "Abrir turma" link in that case.
    ...history.map((r) => ({
      id: r.id,
      classroomId: r.classroom_id ?? "",
      title: r.lesson_content?.slice(0, 80) || "Aula",
      meetingUrl: r.meeting_link ?? "",
      scheduledAt: r.event_time
        ? `${r.event_date}T${r.event_time}-03:00`
        : `${r.event_date}T10:00-03:00`,
    })),
  ]
    .filter((m) => new Date(m.scheduledAt).getTime() >= Date.now() - 60 * 60 * 1000)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  debug.upcomingRowCount = merged.length;

  if (merged.length === 0) {
    const future = isTeacher
      ? admin
          .from("student_history")
          .select("event_date")
          .eq("teacher_id", user.id)
          .eq("status", "Planned")
          .gte("event_date", todayISO)
          .order("event_date", { ascending: true })
          .limit(1)
      : myRosterId
        ? admin
            .from("student_history")
            .select("event_date")
            .eq("roster_student_id", myRosterId)
            .eq("status", "Planned")
            .gte("event_date", todayISO)
            .order("event_date", { ascending: true })
            .limit(1)
        : Promise.resolve({ data: [] });
    const { data: anyFuture } = await future;
    debug.nextFuture =
      (anyFuture as Array<{ event_date: string }> | null)?.[0]?.event_date ??
      null;
    debug.reason = "no-rows-in-window";
    return { ctx: null, debug };
  }

  const next = {
    id: merged[0].id,
    classroom_id: merged[0].classroomId,
    title: merged[0].title,
    meeting_url: merged[0].meetingUrl,
    scheduled_at: merged[0].scheduledAt,
  };

  const { data: classroom } = next.classroom_id
    ? await admin
        .from("classrooms")
        .select("name, teacher_id")
        .eq("id", next.classroom_id)
        .maybeSingle()
    : { data: null };
  const room = (classroom as {
    name: string;
    teacher_id: string;
  } | null) ?? { name: isTeacher ? "Aula avulsa" : "Aula", teacher_id: user.id };

  const counterpart: UpcomingClassContext["counterpart"] = {};
  if (isTeacher) {
    const { data: rosterRows } = next.classroom_id
      ? await admin
          .from("roster_students")
          .select("full_name, has_avatar, id")
          .eq("classroom_id", next.classroom_id)
          .is("deleted_at", null)
      : { data: [] as Array<{
          full_name: string;
          has_avatar: boolean | null;
          id: string;
        }> };
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
