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

export interface UpcomingClassItem {
  id: string;
  title: string;
  /** Full lesson content / notes for the class, when the teacher
   *  filled it in. Null when blank. */
  content: string | null;
  /** Empty string when the class isn't tied to a classroom. */
  classroomId: string;
  /** Display label — classroom name, or the target student's name
   *  for per-student sessions, or a generic fallback. */
  label: string;
  scheduledAt: string;
  meetingUrl: string;
  /** Counterpart name(s). For teachers: the students attending. For
   *  students: the teacher's full name. */
  counterpart: string;
  role: "teacher" | "student";
}

export interface UpcomingClassResult {
  items: UpcomingClassItem[];
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
    return { items: [], debug };
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

  // User-tunable window. Defaults to 5 days when the 053 migration
  // hasn't been applied yet OR the user hasn't chosen a value. A
  // 0-day window is the user's opt-out — return nothing.
  let windowDays = 5;
  try {
    const { data: winRow } = await admin
      .from("profiles")
      .select("upcoming_class_window_days")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (
      winRow as { upcoming_class_window_days?: number | null } | null
    )?.upcoming_class_window_days;
    if (typeof raw === "number" && raw >= 0 && raw <= 30) {
      windowDays = raw;
    }
  } catch {
    /* column may not exist yet — keep default */
  }
  if (windowDays === 0) {
    debug.reason = "opted-out";
    return { items: [], debug };
  }

  const nowMs = Date.now();
  const graceISO = new Date(nowMs - 60 * 60 * 1000).toISOString();
  const windowEndISO = new Date(
    nowMs + windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todayDateISO = new Date().toISOString().slice(0, 10);
  const windowEndDateISO = windowEndISO.slice(0, 10);

  // ---------------------------------------------------------------
  // Identity lookups
  // ---------------------------------------------------------------
  let classroomIds: string[] = [];
  let myRosterId: string | null = null;
  if (isTeacher) {
    const { data: rooms } = await admin
      .from("classrooms")
      .select("id, name")
      .eq("teacher_id", user.id)
      .is("deleted_at", null);
    classroomIds = ((rooms as Array<{ id: string }> | null) ?? []).map(
      (r) => r.id,
    );
  } else {
    const { data: roster } = await admin
      .from("roster_students")
      .select("id, classroom_id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    const row = roster as { id: string; classroom_id: string | null } | null;
    if (row) {
      myRosterId = row.id;
      if (row.classroom_id) classroomIds.push(row.classroom_id);
    }
  }
  debug.classroomCount = classroomIds.length;
  if (classroomIds.length === 0 && !myRosterId && !isTeacher) {
    debug.reason = "no-classrooms";
    return { items: [], debug };
  }

  // ---------------------------------------------------------------
  // Fetch both sources
  // ---------------------------------------------------------------
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

  const scheduledReq =
    classroomIds.length > 0
      ? admin
          .from("scheduled_classes")
          .select("id, classroom_id, title, meeting_url, scheduled_at")
          .in("classroom_id", classroomIds)
          .gte("scheduled_at", graceISO)
          .lte("scheduled_at", windowEndISO)
          .order("scheduled_at", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [] as SchedRow[] });

  const historyBase = admin
    .from("student_history")
    .select(
      "id, classroom_id, roster_student_id, event_date, event_time, meeting_link, lesson_content, status",
    )
    .eq("status", "Planned")
    .gte("event_date", todayDateISO)
    .lte("event_date", windowEndDateISO)
    .order("event_date", { ascending: true })
    .limit(20);
  const historyReq = isTeacher
    ? historyBase.eq("teacher_id", user.id)
    : myRosterId
      ? historyBase.eq("roster_student_id", myRosterId)
      : Promise.resolve({ data: [] as HistRow[] });

  const [scheduledRes, historyRes] = await Promise.all([
    scheduledReq,
    historyReq,
  ]);
  const scheduled = (scheduledRes.data ?? []) as SchedRow[];
  const history = (historyRes.data ?? []) as HistRow[];

  // ---------------------------------------------------------------
  // Enrichment lookups (resolve classroom names + student names in
  // a single batch per table)
  // ---------------------------------------------------------------
  const allClassroomIds = Array.from(
    new Set(
      [
        ...scheduled.map((r) => r.classroom_id),
        ...history.map((r) => r.classroom_id).filter((id): id is string => !!id),
      ].filter(Boolean),
    ),
  );
  const classroomNameById = new Map<string, string>();
  const classroomTeacherById = new Map<string, string>();
  if (allClassroomIds.length > 0) {
    const { data } = await admin
      .from("classrooms")
      .select("id, name, teacher_id")
      .in("id", allClassroomIds);
    for (const row of (data ?? []) as Array<{
      id: string;
      name: string;
      teacher_id: string;
    }>) {
      classroomNameById.set(row.id, row.name);
      classroomTeacherById.set(row.id, row.teacher_id);
    }
  }

  const rosterIdsToLookup = Array.from(
    new Set(
      history
        .map((r) => r.roster_student_id)
        .filter((id): id is string => !!id),
    ),
  );
  const rosterNameById = new Map<string, string>();
  const rosterClassroomById = new Map<string, string | null>();
  if (rosterIdsToLookup.length > 0) {
    const { data } = await admin
      .from("roster_students")
      .select("id, full_name, classroom_id")
      .in("id", rosterIdsToLookup);
    for (const row of (data ?? []) as Array<{
      id: string;
      full_name: string;
      classroom_id: string | null;
    }>) {
      rosterNameById.set(row.id, row.full_name);
      rosterClassroomById.set(row.id, row.classroom_id);
    }
  }

  // Per-classroom roster counterpart cache (teacher view — list of
  // students in the classroom).
  const classroomRosterCache = new Map<string, string>();
  async function classroomRosterSummary(classroomId: string): Promise<string> {
    const cached = classroomRosterCache.get(classroomId);
    if (cached !== undefined) return cached;
    const { data } = await admin
      .from("roster_students")
      .select("full_name")
      .eq("classroom_id", classroomId)
      .is("deleted_at", null);
    const names = ((data as Array<{ full_name: string }> | null) ?? []).map(
      (r) => r.full_name,
    );
    const summary =
      names.length === 0
        ? "0 alunos"
        : names.length === 1
          ? names[0]
          : names.length <= 3
            ? names.join(" · ")
            : `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
    classroomRosterCache.set(classroomId, summary);
    return summary;
  }

  // Teacher name cache (student view).
  let myTeacherName: string | null = null;
  if (!isTeacher) {
    const teacherIds = Array.from(
      new Set(
        [...allClassroomIds.map((id) => classroomTeacherById.get(id))].filter(
          (t): t is string => !!t,
        ),
      ),
    );
    if (teacherIds.length > 0) {
      const { data } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", teacherIds[0])
        .maybeSingle();
      myTeacherName =
        (data as { full_name?: string } | null)?.full_name ?? null;
    }
  }

  // ---------------------------------------------------------------
  // Merge + normalise + deduplicate
  // ---------------------------------------------------------------
  const items: UpcomingClassItem[] = [];

  for (const r of scheduled) {
    const classroomId = r.classroom_id;
    const label = classroomNameById.get(classroomId) ?? "Turma";
    items.push({
      id: r.id,
      title: r.title || "Aula",
      content: null,
      classroomId,
      label,
      scheduledAt: r.scheduled_at,
      meetingUrl: r.meeting_url,
      counterpart: isTeacher
        ? await classroomRosterSummary(classroomId)
        : (myTeacherName ?? "Professor"),
      role: isTeacher ? "teacher" : "student",
    });
  }

  for (const r of history) {
    const classroomId =
      r.classroom_id ??
      (r.roster_student_id
        ? rosterClassroomById.get(r.roster_student_id) ?? ""
        : "");
    const studentName = r.roster_student_id
      ? rosterNameById.get(r.roster_student_id) ?? null
      : null;
    const classroomName = classroomId
      ? classroomNameById.get(classroomId) ?? null
      : null;
    const label =
      classroomName ??
      (studentName ? studentName : "Aula");
    const scheduledAt = r.event_time
      ? `${r.event_date}T${r.event_time}-03:00`
      : `${r.event_date}T10:00-03:00`;

    let counterpart: string;
    if (isTeacher) {
      counterpart = studentName
        ? studentName
        : classroomId
          ? await classroomRosterSummary(classroomId)
          : "—";
    } else {
      counterpart = myTeacherName ?? "Professor";
    }

    const contentText = (r.lesson_content ?? "").trim() || null;
    const firstLine = contentText ? contentText.split("\n")[0] : "";
    items.push({
      id: r.id,
      title: firstLine.slice(0, 80) || "Aula",
      content: contentText,
      classroomId,
      label,
      scheduledAt,
      meetingUrl: r.meeting_link ?? "",
      counterpart,
      role: isTeacher ? "teacher" : "student",
    });
  }

  // Drop anything before the grace window and sort by time.
  const filtered = items
    .filter(
      (m) => new Date(m.scheduledAt).getTime() >= nowMs - 60 * 60 * 1000,
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5);

  debug.upcomingRowCount = filtered.length;
  if (filtered.length === 0) {
    debug.reason = "no-rows-in-window";
    return { items: [], debug };
  }

  debug.reason = "ok";
  return { items: filtered, debug };
}
