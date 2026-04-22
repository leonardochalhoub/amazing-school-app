"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TeacherSelfAssignmentRow {
  id: string;
  lessonSlug: string;
  status: "assigned" | "completed" | string;
  assignedAt: string | null;
  completedAt: string | null;
}

/**
 * Lesson assignments the teacher made to themselves — any row where
 * assigned_by = student_id = teacher.id. Joined with lesson_progress
 * so the UI can render a correct completion state without relying
 * on the assignment's own `status` column (which is authoritative
 * for per-student rows but not for classroom-wide rows the teacher
 * may have completed without touching the shared row).
 */
export async function getTeacherSelfAssignments(
  limit = 25,
): Promise<TeacherSelfAssignmentRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("lesson_assignments")
    .select("id, lesson_slug, status, assigned_at")
    .eq("student_id", user.id)
    .eq("assigned_by", user.id)
    .order("assigned_at", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];

  const slugs = Array.from(
    new Set(rows.map((r) => r.lesson_slug as string)),
  );

  // Completion state from lesson_progress — authoritative for the
  // teacher's own completions regardless of the assignment row's
  // lingering "assigned" status.
  const { data: progress } = await admin
    .from("lesson_progress")
    .select("lesson_slug, completed_at")
    .eq("student_id", user.id)
    .in("lesson_slug", slugs)
    .not("completed_at", "is", null);
  const completedBySlug = new Map<string, string>();
  for (const p of (progress ?? []) as Array<{
    lesson_slug: string;
    completed_at: string;
  }>) {
    completedBySlug.set(p.lesson_slug, p.completed_at);
  }

  return rows.map((r) => {
    const completedAt = completedBySlug.get(r.lesson_slug as string) ?? null;
    return {
      id: r.id as string,
      lessonSlug: r.lesson_slug as string,
      status: completedAt
        ? "completed"
        : ((r.status as string | null) ?? "assigned"),
      assignedAt: (r.assigned_at as string | null) ?? null,
      completedAt,
    };
  });
}
