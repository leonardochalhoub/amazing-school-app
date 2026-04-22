import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fan out XP for a live class that just flipped to status='Done'.
 *
 * Rules:
 *  - Teacher earns `xp_reward` (default 30) when their xp_enabled=true.
 *    When off, the class still runs, the teacher just doesn't collect.
 *  - Student(s) involved always earn:
 *      · per-roster row → the single roster student (or the auth
 *        profile linked via roster_students.auth_user_id)
 *      · per-profile row → that auth user
 *      · classroom-wide row → every non-deleted roster student with a
 *        linked auth_user_id in that classroom
 *
 * Idempotent via (source, source_id): re-running for the same
 * history_id inserts no duplicate rows, so toggling a class
 * Done → not-Done → Done again grants at most once per participant.
 */
export async function grantLiveClassXp(historyId: string): Promise<void> {
  if (!historyId) return;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("student_history")
    .select(
      "id, teacher_id, student_id, roster_student_id, classroom_id, xp_reward, status",
    )
    .eq("id", historyId)
    .maybeSingle();
  const hr = row as {
    id: string;
    teacher_id: string;
    student_id: string | null;
    roster_student_id: string | null;
    classroom_id: string | null;
    xp_reward: number | null;
    status: string;
  } | null;
  if (!hr || hr.status !== "Done") return;

  const xp = hr.xp_reward ?? 30;
  if (xp <= 0) return;

  // Collect every student profile that should receive XP.
  const studentIds = new Set<string>();

  if (hr.student_id) {
    studentIds.add(hr.student_id);
  }
  if (hr.roster_student_id) {
    const { data: r } = await admin
      .from("roster_students")
      .select("auth_user_id")
      .eq("id", hr.roster_student_id)
      .maybeSingle();
    const authId = (r as { auth_user_id?: string | null } | null)?.auth_user_id;
    if (authId) studentIds.add(authId);
  }
  if (!hr.student_id && !hr.roster_student_id && hr.classroom_id) {
    const { data: roster } = await admin
      .from("roster_students")
      .select("auth_user_id")
      .eq("classroom_id", hr.classroom_id)
      .is("deleted_at", null)
      .is("ended_on", null)
      .not("auth_user_id", "is", null);
    for (const r of (roster ?? []) as Array<{ auth_user_id: string | null }>) {
      if (r.auth_user_id) studentIds.add(r.auth_user_id);
    }
  }

  const rows: Array<{
    student_id: string;
    classroom_id: string | null;
    xp_amount: number;
    source: string;
    source_id: string;
  }> = [];

  for (const sid of studentIds) {
    rows.push({
      student_id: sid,
      classroom_id: hr.classroom_id,
      xp_amount: xp,
      source: "lesson",
      source_id: `live:${hr.id}`,
    });
  }

  // Teacher — gated on xp_enabled.
  if (hr.teacher_id) {
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", hr.teacher_id)
      .maybeSingle();
    const isTeacher = (prof as { role?: string } | null)?.role === "teacher";
    let teacherXpOn = true;
    if (isTeacher) {
      try {
        const { data: xpRow } = await admin
          .from("profiles")
          .select("xp_enabled")
          .eq("id", hr.teacher_id)
          .maybeSingle();
        const raw = (xpRow as { xp_enabled?: boolean | null } | null)
          ?.xp_enabled;
        if (raw === false) teacherXpOn = false;
      } catch {
        /* column absent → default on */
      }
    }
    if (teacherXpOn) {
      rows.push({
        student_id: hr.teacher_id,
        classroom_id: hr.classroom_id,
        xp_amount: xp,
        source: "teacher_teach",
        source_id: `live:${hr.id}`,
      });
    }
  }

  if (rows.length === 0) return;

  // Idempotency: xp_events has no (source, source_id, student_id)
  // unique constraint, so we filter out rows that already exist for
  // this history-id. Cheap because we hit it with exactly one round-
  // trip using the source_id filter.
  const sourceId = `live:${hr.id}`;
  const { data: already } = await admin
    .from("xp_events")
    .select("student_id")
    .eq("source_id", sourceId);
  const existing = new Set(
    ((already ?? []) as Array<{ student_id: string }>).map((r) => r.student_id),
  );
  const fresh = rows.filter((r) => !existing.has(r.student_id));
  if (fresh.length === 0) return;

  const { error } = await admin.from("xp_events").insert(fresh);
  if (error) console.error("grantLiveClassXp insert:", error);
}
