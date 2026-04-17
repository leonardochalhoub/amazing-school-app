"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  SubmitSchema,
  type SubmitExerciseInput,
  type ExerciseResponseRow,
} from "@/lib/actions/exercise-responses-types";

export async function submitExerciseResponse(input: SubmitExerciseInput) {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save your answer." };

  const { data, error } = await supabase
    .from("student_exercise_responses")
    .upsert(
      {
        student_id: user.id,
        lesson_slug: parsed.data.lessonSlug,
        exercise_index: parsed.data.exerciseIndex,
        exercise_type: parsed.data.answer.type,
        answer: parsed.data.answer,
      },
      { onConflict: "student_id,lesson_slug,exercise_index" }
    )
    .select("id, lesson_slug, exercise_index, exercise_type, answer, created_at, updated_at")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/student/music/${parsed.data.lessonSlug.replace(/^music:/, "")}`);
  revalidatePath(`/student/lessons/${parsed.data.lessonSlug}`);

  return {
    success: true as const,
    response: data as ExerciseResponseRow,
  };
}

export async function listMyExerciseResponses(
  lessonSlug: string
): Promise<ExerciseResponseRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("student_exercise_responses")
    .select("id, lesson_slug, exercise_index, exercise_type, answer, created_at, updated_at")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .order("exercise_index", { ascending: true });

  return (data as ExerciseResponseRow[] | null) ?? [];
}

export async function listResponsesForTeacher(params: {
  studentId: string;
  lessonSlug?: string;
}): Promise<ExerciseResponseRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from("student_exercise_responses")
    .select("id, lesson_slug, exercise_index, exercise_type, answer, created_at, updated_at")
    .eq("student_id", params.studentId);

  if (params.lessonSlug) q = q.eq("lesson_slug", params.lessonSlug);

  const { data } = await q
    .order("lesson_slug", { ascending: true })
    .order("exercise_index", { ascending: true });

  return (data as ExerciseResponseRow[] | null) ?? [];
}
