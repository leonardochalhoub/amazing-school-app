"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLesson } from "@/lib/content/loader";
import type { LessonAssignment } from "@/lib/supabase/types";

export async function getAssignedLessons(
  classroomId: string
): Promise<LessonAssignment[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .or(`student_id.is.null,student_id.eq.${user.id}`)
    .order("order_index", { ascending: true })
    .order("assigned_at", { ascending: false });
  return (data as LessonAssignment[] | null) ?? [];
}

export async function startLesson(lessonSlug: string, classroomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const lesson = await getLesson(lessonSlug);
  if (!lesson) return { error: "Lesson not found" };

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (existing) return { alreadyStarted: true as const };

  const { error } = await supabase.from("lesson_progress").insert({
    student_id: user.id,
    lesson_slug: lessonSlug,
    classroom_id: classroomId,
    total_exercises: lesson.exercises.length,
  });

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function submitAnswer(
  lessonSlug: string,
  _exerciseId: string,
  classroomId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .eq("classroom_id", classroomId)
    .maybeSingle();

  if (!progress) return { error: "Lesson not started" };

  const newCompleted = progress.completed_exercises + 1;
  const isComplete = newCompleted >= progress.total_exercises;

  await supabase
    .from("lesson_progress")
    .update({
      completed_exercises: newCompleted,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", progress.id);

  if (isComplete) {
    const lesson = await getLesson(lessonSlug);
    if (lesson) {
      await supabase.from("xp_events").insert({
        student_id: user.id,
        classroom_id: classroomId,
        xp_amount: lesson.xp_reward,
        source: "lesson",
        source_id: lessonSlug,
      });

      await supabase.from("daily_activity").upsert(
        {
          student_id: user.id,
          activity_date: new Date().toISOString().split("T")[0],
          lesson_count: 1,
          chat_messages: 0,
        },
        { onConflict: "student_id,activity_date" }
      );

      await supabase
        .from("lesson_assignments")
        .update({ status: "completed" })
        .eq("classroom_id", classroomId)
        .eq("lesson_slug", lessonSlug)
        .eq("student_id", user.id);
    }
  }

  revalidatePath("/student");
  revalidatePath("/student/lessons");
  return { completed: isComplete };
}

export async function getStudentProgress(classroomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("classroom_id", classroomId);

  return data ?? [];
}
