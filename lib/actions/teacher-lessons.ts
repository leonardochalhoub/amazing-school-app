"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  TeacherLessonSchema,
  type TeacherLessonInput,
  type TeacherLessonRow,
} from "@/lib/actions/teacher-lessons-types";

export async function saveTeacherLesson(input: TeacherLessonInput) {
  const parsed = TeacherLessonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const record = {
    teacher_id: user.id,
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    cefr_level: parsed.data.cefr_level ?? null,
    category: parsed.data.category ?? null,
    exercises: parsed.data.exercises,
    published: parsed.data.published ?? false,
  };

  const { data, error } = await supabase
    .from("teacher_lessons")
    .upsert(record, { onConflict: "teacher_id,slug" })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${parsed.data.slug}`);
  return { success: true as const, lesson: data as TeacherLessonRow };
}

export async function deleteTeacherLesson(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase
    .from("teacher_lessons")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/lessons");
  return { success: true as const };
}

export async function listMyTeacherLessons(): Promise<TeacherLessonRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("teacher_lessons")
    .select("*")
    .eq("teacher_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as TeacherLessonRow[] | null) ?? [];
}

export async function getMyTeacherLessonBySlug(
  slug: string
): Promise<TeacherLessonRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("teacher_lessons")
    .select("*")
    .eq("teacher_id", user.id)
    .eq("slug", slug)
    .maybeSingle();
  return (data as TeacherLessonRow | null) ?? null;
}
