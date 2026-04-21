"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpcomingClassContext {
  id: string;
  title: string;
  classroomId: string;
  classroomName: string;
  scheduledAt: string;
  meetingUrl: string;
  role: "teacher" | "student";
  /** Counterpart name(s): for teachers it's the class roster names,
   *  for students it's the teacher's full name. */
  counterpart: {
    teacherName?: string;
    students?: Array<{ name: string; avatarUrl: string | null }>;
    totalStudents?: number;
  };
  /** Lessons the student (or the teacher's students) should prep for
   *  this class — assigned but not completed yet. */
  prepLessons: Array<{
    slug: string;
    title: string;
    cefrLevel: string | null;
  }>;
  /** Observations from the previous held class, if any — helps both
   *  sides pick up the conversation mid-stream. */
  previousNote: string | null;
}

/**
 * Next upcoming class for the signed-in user (teacher or student).
 * Returns null once the only upcoming class is within the past hour,
 * matching "stops after the class is past" — we give a 60-minute
 * grace window after scheduled_at so a popup doesn't disappear
 * mid-class.
 */
export async function getMyNextClass(): Promise<UpcomingClassContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
  const isTeacher = role === "teacher" || role === "owner";

  // Near-future window: 1 hour grace after start (so the popup
  // persists through class time) through 14 days ahead. Earlier
  // 4-day cap was too tight — teachers here sometimes only touch
  // the app weekly, so a class 5 days out was invisible.
  const graceWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  let classroomIds: string[] = [];
  if (isTeacher) {
    const { data: rooms, error: roomsErr } = await admin
      .from("classrooms")
      .select("id")
      .eq("teacher_id", user.id)
      .is("deleted_at", null);
    if (roomsErr) console.warn("[upcoming-class] rooms err", roomsErr.message);
    classroomIds = ((rooms as Array<{ id: string }> | null) ?? []).map(
      (r) => r.id,
    );
  } else {
    const { data: roster, error: rosterErr } = await admin
      .from("roster_students")
      .select("classroom_id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null);
    if (rosterErr)
      console.warn("[upcoming-class] roster err", rosterErr.message);
    classroomIds = (
      (roster as Array<{ classroom_id: string | null }> | null) ?? []
    )
      .map((r) => r.classroom_id)
      .filter((v): v is string => !!v);
  }
  if (classroomIds.length === 0) {
    console.info(
      `[upcoming-class] ${role} ${user.id} has no classrooms — skipping popup`,
    );
    return null;
  }

  const { data: upcoming, error: upcomingErr } = await admin
    .from("scheduled_classes")
    .select("id, classroom_id, title, meeting_url, scheduled_at")
    .in("classroom_id", classroomIds)
    .gte("scheduled_at", graceWindow)
    .lte("scheduled_at", windowEnd)
    .order("scheduled_at", { ascending: true })
    .limit(1);
  if (upcomingErr)
    console.warn("[upcoming-class] upcoming err", upcomingErr.message);
  if (!upcoming || upcoming.length === 0) {
    // Secondary lookup that ignores the time window — helps diagnose
    // whether the data exists at all but is outside the next-4-days
    // cutoff.
    const { data: any } = await admin
      .from("scheduled_classes")
      .select("scheduled_at")
      .in("classroom_id", classroomIds)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1);
    const nextAny = (any as Array<{ scheduled_at: string }> | null)?.[0];
    console.info(
      `[upcoming-class] ${role} ${user.id} · no class in 4d window (rooms=${classroomIds.length}, nextFuture=${nextAny?.scheduled_at ?? "none"})`,
    );
  }
  const next = (upcoming as Array<{
    id: string;
    classroom_id: string;
    title: string;
    meeting_url: string;
    scheduled_at: string;
  }> | null)?.[0];
  if (!next) return null;

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

  return {
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
  };
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
