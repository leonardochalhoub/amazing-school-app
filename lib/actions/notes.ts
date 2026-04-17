"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StudentNote } from "@/lib/supabase/types";

const CreateSchema = z.object({
  classroomId: z.string().uuid(),
  studentId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function createNote(input: z.input<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("student_notes").insert({
    classroom_id: parsed.data.classroomId,
    student_id: parsed.data.studentId,
    teacher_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { error: error.message };

  revalidatePath(
    `/teacher/classroom/${parsed.data.classroomId}/students/${parsed.data.studentId}`
  );
  return { success: true as const };
}

export async function listNotesForStudent(
  classroomId: string,
  studentId: string
): Promise<StudentNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_notes")
    .select("*")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data as StudentNote[] | null) ?? [];
}

const DeleteSchema = z.object({ noteId: z.string().uuid() });

export async function deleteNote(input: z.input<typeof DeleteSchema>) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("student_notes")
    .select("classroom_id, student_id")
    .eq("id", parsed.data.noteId)
    .maybeSingle();

  const { error } = await supabase
    .from("student_notes")
    .delete()
    .eq("id", parsed.data.noteId);
  if (error) return { error: error.message };

  if (row) {
    revalidatePath(
      `/teacher/classroom/${row.classroom_id}/students/${row.student_id}`
    );
  }
  return { success: true as const };
}
