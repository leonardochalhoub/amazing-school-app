"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardEligibleBadges } from "@/lib/gamification/award-badges";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CompleteSchema = z.object({
  lessonSlug: z.string().min(1).max(160),
  xpReward: z.number().int().min(0).max(1000).optional(),
});

/**
 * Marks a lesson or music slug as completed for the signed-in student.
 *
 *   - Upserts a lesson_progress row (started_at set if missing, completed_at
 *     set to now).
 *   - Inserts a single xp_events row (only on the transition from not-
 *     completed to completed — won't double-award if called twice).
 *   - Flips the student's lesson_assignments row to status=completed.
 *   - Upserts today's daily_activity for the streak counter.
 */
export async function markLessonComplete(
  input: z.input<typeof CompleteSchema>
) {
  const parsed = CompleteSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };

  const admin = createAdminClient();

  // Find the classroom this student is in (required for lesson_progress +
  // assignment updates). Prefer classroom_members, fall back to roster link.
  const { data: membership } = await admin
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();
  let classroomId =
    (membership as { classroom_id: string } | null)?.classroom_id ?? null;

  let rosterId: string | null = null;
  if (!classroomId) {
    const { data: roster } = await admin
      .from("roster_students")
      .select("id, classroom_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    rosterId = (roster as { id: string } | null)?.id ?? null;
    classroomId =
      (roster as { classroom_id: string | null } | null)?.classroom_id ?? null;
  } else {
    const { data: roster } = await admin
      .from("roster_students")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    rosterId = (roster as { id: string } | null)?.id ?? null;
  }

  if (!classroomId) {
    // Teachers previewing content: silently no-op.
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (prof as { role?: string } | null)?.role ?? null;
    if (role === "teacher") {
      return {
        success: true as const,
        awardedXp: 0,
        alreadyCompleted: false as const,
      };
    }
    // Students without a classroom still get full progress + XP +
    // streak tracking (migration 028 allows classroom_id = NULL on
    // lesson_progress / xp_events). They simply don't contribute to
    // any classroom-scoped analytics until a teacher assigns them.
  }

  // 1. lesson_progress — detect first-time completion so XP is only awarded once.
  let progressQuery = admin
    .from("lesson_progress")
    .select("id, started_at, completed_at")
    .eq("student_id", user.id)
    .eq("lesson_slug", parsed.data.lessonSlug);
  progressQuery = classroomId
    ? progressQuery.eq("classroom_id", classroomId)
    : progressQuery.is("classroom_id", null);
  const { data: existing, error: existingErr } = await progressQuery.maybeSingle();
  if (existingErr) {
    console.error("lesson_progress select error:", existingErr);
    return { error: `Could not read progress: ${existingErr.message}` };
  }
  const isFirstCompletion = !existing || !existing.completed_at;

  // Migration 028 replaced the single UNIQUE constraint with two partial
  // unique indexes (one for classroom_id != null, one for classroom_id
  // is null). PostgreSQL's ON CONFLICT needs a matching named constraint
  // or a columns + predicate inference the Supabase JS client doesn't
  // expose cleanly, so we skip upsert entirely and do explicit
  // update-or-insert using the row we already looked up above.
  const existingId = (existing as { id?: string } | null)?.id ?? null;
  const row = {
    student_id: user.id,
    classroom_id: classroomId,
    lesson_slug: parsed.data.lessonSlug,
    started_at:
      (existing as { started_at?: string } | null)?.started_at ??
      new Date().toISOString(),
    completed_at: new Date().toISOString(),
    completed_exercises: 0,
    total_exercises: 0,
  };
  const upRes = existingId
    ? await admin.from("lesson_progress").update(row).eq("id", existingId)
    : await admin.from("lesson_progress").insert(row);
  const upErr = upRes.error;
  if (upErr) {
    // A unique-violation here means a concurrent insert landed the row
    // between our select and our insert. Re-read and update that row.
    if (upErr.code === "23505") {
      let requery = admin
        .from("lesson_progress")
        .select("id")
        .eq("student_id", user.id)
        .eq("lesson_slug", parsed.data.lessonSlug);
      requery = classroomId
        ? requery.eq("classroom_id", classroomId)
        : requery.is("classroom_id", null);
      const { data: racedRow } = await requery.maybeSingle();
      const racedId = (racedRow as { id?: string } | null)?.id;
      if (racedId) {
        const { error: retryErr } = await admin
          .from("lesson_progress")
          .update(row)
          .eq("id", racedId);
        if (retryErr) {
          console.error("lesson_progress retry error:", retryErr);
          return { error: `Could not save progress: ${retryErr.message}` };
        }
      } else {
        console.error("lesson_progress unique violation but no row found");
        return { error: `Could not save progress: ${upErr.message}` };
      }
    } else {
      console.error("lesson_progress save error:", upErr);
      return { error: `Could not save progress: ${upErr.message}` };
    }
  }

  // 2. XP — only award on transition. xp_events schema uses (source, source_id).
  // Use `||` (not `??`) so a lesson shipping with xp_reward=0 in its
  // content still grants the default 25 — the user saw "Concluído!
  // +0 XP" when the content file had a zeroed reward field.
  const xp = parsed.data.xpReward || 25;
  if (isFirstCompletion && xp > 0) {
    const { error: xpErr } = await admin.from("xp_events").insert({
      student_id: user.id,
      classroom_id: classroomId,
      xp_amount: xp,
      // xp_events.source has a CHECK constraint: only 'lesson' | 'ai_chat' |
      // 'streak_bonus' | 'badge'. Music completions go through as 'lesson'
      // too; source_id distinguishes (music:... prefix).
      source: "lesson",
      source_id: parsed.data.lessonSlug,
    });
    if (xpErr) console.error("xp_events insert error:", xpErr);
    // xp_events is best-effort; the core progress is already recorded.
  }

  // 3. Flip matching lesson_assignments row to completed. Classroom-wide
  // and classroom-scoped matchers only apply when we have a classroom;
  // per-student and per-roster assignments work in both cases.
  const assignmentMatchers = [
    admin
      .from("lesson_assignments")
      .update({ status: "completed" })
      .eq("lesson_slug", parsed.data.lessonSlug)
      .eq("student_id", user.id),
  ];
  if (classroomId) {
    assignmentMatchers.push(
      admin
        .from("lesson_assignments")
        .update({ status: "completed" })
        .eq("classroom_id", classroomId)
        .eq("lesson_slug", parsed.data.lessonSlug)
        .is("student_id", null)
        .is("roster_student_id", null)
        .neq("status", "skipped"),
    );
  }
  if (rosterId) {
    assignmentMatchers.push(
      admin
        .from("lesson_assignments")
        .update({ status: "completed" })
        .eq("lesson_slug", parsed.data.lessonSlug)
        .eq("roster_student_id", rosterId),
    );
  }
  await Promise.all(assignmentMatchers);

  // 4. Streak ping.
  const today = new Date().toISOString().slice(0, 10);
  await admin
    .from("daily_activity")
    .upsert(
      { student_id: user.id, activity_date: today },
      { onConflict: "student_id,activity_date" }
    );

  // 5. Evaluate non-cert badges (welcome_aboard, first_lesson, streak_*,
  // level_*, music_lover, bookworm, …). Idempotent — safe to call on
  // every completion. Errors are logged but never block the user.
  try {
    await awardEligibleBadges(user.id);
  } catch (err) {
    console.error("awardEligibleBadges error:", err);
  }

  revalidatePath("/student");
  revalidatePath(`/student/music/${parsed.data.lessonSlug.replace(/^music:/, "")}`);
  revalidatePath(`/student/lessons/${parsed.data.lessonSlug}`);

  return {
    success: true as const,
    awardedXp: isFirstCompletion ? xp : 0,
    alreadyCompleted: !isFirstCompletion,
  };
}
