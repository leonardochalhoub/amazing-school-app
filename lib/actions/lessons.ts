"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLesson } from "@/lib/content/loader";

export async function assignLesson(
  classroomId: string,
  lessonSlug: string,
  dueDate?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("lesson_assignments").insert({
    classroom_id: classroomId,
    lesson_slug: lessonSlug,
    assigned_by: user.id,
    due_date: dueDate ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/teacher/classroom/${classroomId}`);
  return { success: true };
}

export async function getAssignedLessons(classroomId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("assigned_at", { ascending: false });

  return data ?? [];
}

export async function startLesson(
  lessonSlug: string,
  classroomId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const lesson = await getLesson(lessonSlug);
  if (!lesson) return { error: "Lesson not found" };

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .eq("classroom_id", classroomId)
    .single();

  if (existing) return { alreadyStarted: true };

  const { error } = await supabase.from("lesson_progress").insert({
    student_id: user.id,
    lesson_slug: lessonSlug,
    classroom_id: classroomId,
    total_exercises: lesson.exercises.length,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function submitAnswer(
  lessonSlug: string,
  exerciseId: string,
  classroomId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .eq("classroom_id", classroomId)
    .single();

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
    }
  }

  revalidatePath("/student");
  return { completed: isComplete };
}

export async function getStudentProgress(classroomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("classroom_id", classroomId);

  return data ?? [];
}
