"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    return { error: "You're not in a classroom yet." };
  }

  // 1. lesson_progress — detect first-time completion so XP is only awarded once.
  const { data: existing } = await admin
    .from("lesson_progress")
    .select("id, completed_at")
    .eq("student_id", user.id)
    .eq("classroom_id", classroomId)
    .eq("lesson_slug", parsed.data.lessonSlug)
    .maybeSingle();
  const isFirstCompletion = !existing || !existing.completed_at;

  await admin.from("lesson_progress").upsert(
    {
      student_id: user.id,
      classroom_id: classroomId,
      lesson_slug: parsed.data.lessonSlug,
      started_at:
        (existing as { started_at?: string } | null)?.started_at ??
        new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,classroom_id,lesson_slug" }
  );

  // 2. XP — only award on transition.
  const xp = parsed.data.xpReward ?? 25;
  if (isFirstCompletion && xp > 0) {
    await admin.from("xp_events").insert({
      student_id: user.id,
      classroom_id: classroomId,
      xp_amount: xp,
      reason: `Completed ${parsed.data.lessonSlug}`,
    });
  }

  // 3. Flip matching lesson_assignments row to completed. Match per-student,
  // per-roster, and classroom-wide rows.
  const assignmentMatchers = [
    // per-auth-student
    admin
      .from("lesson_assignments")
      .update({ status: "completed" })
      .eq("classroom_id", classroomId)
      .eq("lesson_slug", parsed.data.lessonSlug)
      .eq("student_id", user.id),
    // classroom-wide (only if student hasn't explicitly skipped it)
    admin
      .from("lesson_assignments")
      .update({ status: "completed" })
      .eq("classroom_id", classroomId)
      .eq("lesson_slug", parsed.data.lessonSlug)
      .is("student_id", null)
      .is("roster_student_id", null)
      .neq("status", "skipped"),
  ];
  if (rosterId) {
    assignmentMatchers.push(
      admin
        .from("lesson_assignments")
        .update({ status: "completed" })
        .eq("classroom_id", classroomId)
        .eq("lesson_slug", parsed.data.lessonSlug)
        .eq("roster_student_id", rosterId)
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

  revalidatePath("/student");
  revalidatePath(`/student/music/${parsed.data.lessonSlug.replace(/^music:/, "")}`);
  revalidatePath(`/student/lessons/${parsed.data.lessonSlug}`);

  return {
    success: true as const,
    awardedXp: isFirstCompletion ? xp : 0,
    alreadyCompleted: !isFirstCompletion,
  };
}
