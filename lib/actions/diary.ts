"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface DiaryEntry {
  id: string;
  roster_student_id: string;
  teacher_id: string;
  body: string;
  mood: "great" | "good" | "ok" | "tough" | "rough" | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

const UuidSchema = z.string().uuid();
const MoodSchema = z.enum(["great", "good", "ok", "tough", "rough"]).nullable();

const CreateSchema = z.object({
  rosterStudentId: UuidSchema,
  body: z.string().min(1).max(8000),
  mood: MoodSchema.optional(),
  entryDate: z.string().optional(),
});

async function verifyOwnership(rosterStudentId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roster_students")
    .select("id")
    .eq("id", rosterStudentId)
    .eq("teacher_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function createDiaryEntry(input: z.input<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!(await verifyOwnership(parsed.data.rosterStudentId, user.id))) {
    return { error: "Student not found" };
  }

  const { error } = await supabase.from("roster_diary").insert({
    roster_student_id: parsed.data.rosterStudentId,
    teacher_id: user.id,
    body: parsed.data.body,
    mood: parsed.data.mood ?? null,
    entry_date: parsed.data.entryDate ?? new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: error.message };

  revalidatePath(`/teacher/students/${parsed.data.rosterStudentId}`);
  return { success: true as const };
}

const DeleteSchema = z.object({ id: UuidSchema });

export async function deleteDiaryEntry(input: z.input<typeof DeleteSchema>) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("roster_diary")
    .select("roster_student_id")
    .eq("id", parsed.data.id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("roster_diary")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  if (row) revalidatePath(`/teacher/students/${row.roster_student_id}`);
  return { success: true as const };
}

export async function listDiaryForStudent(
  rosterStudentId: string
): Promise<DiaryEntry[]> {
  if (!UuidSchema.safeParse(rosterStudentId).success) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("roster_diary")
    .select("*")
    .eq("roster_student_id", rosterStudentId)
    .eq("teacher_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data as DiaryEntry[] | null) ?? [];
}
