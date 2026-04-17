"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AssignmentStatus, LessonAssignment } from "@/lib/supabase/types";

const UuidSchema = z.string().uuid();
const SlugSchema = z.string().min(1).max(120);

const AssignSchema = z.object({
  classroomId: UuidSchema,
  lessonSlug: SlugSchema,
  studentId: UuidSchema.nullable().optional(),
  rosterStudentId: UuidSchema.nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
  dueDate: z.string().datetime().optional(),
});

export type AssignInput = z.input<typeof AssignSchema>;

function bumpPaths(
  classroomId: string,
  studentId: string | null,
  rosterStudentId: string | null
) {
  revalidatePath(`/teacher/classroom/${classroomId}`);
  if (studentId) {
    revalidatePath(`/teacher/classroom/${classroomId}/students/${studentId}`);
  }
  if (rosterStudentId) {
    revalidatePath(`/teacher/students/${rosterStudentId}`);
  }
  revalidatePath("/teacher");
  revalidatePath("/student/lessons");
}

export async function assignLesson(input: AssignInput) {
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Guard: both student targets set at once is invalid
  if (parsed.data.studentId && parsed.data.rosterStudentId) {
    return { error: "Provide only one of studentId or rosterStudentId" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("lesson_assignments").insert({
    classroom_id: parsed.data.classroomId,
    lesson_slug: parsed.data.lessonSlug,
    student_id: parsed.data.studentId ?? null,
    roster_student_id: parsed.data.rosterStudentId ?? null,
    order_index: parsed.data.orderIndex,
    assigned_by: user.id,
    due_date: parsed.data.dueDate ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already assigned" };
    return { error: error.message };
  }

  bumpPaths(
    parsed.data.classroomId,
    parsed.data.studentId ?? null,
    parsed.data.rosterStudentId ?? null
  );
  return { success: true as const };
}

const BulkSchema = z.object({
  classroomId: UuidSchema,
  lessonSlug: SlugSchema,
  orderIndex: z.number().int().min(0).default(0),
  dueDate: z.string().datetime().optional(),
});

export async function bulkAssignToClassroom(input: z.input<typeof BulkSchema>) {
  const parsed = BulkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  return assignLesson({
    classroomId: parsed.data.classroomId,
    lessonSlug: parsed.data.lessonSlug,
    studentId: null,
    rosterStudentId: null,
    orderIndex: parsed.data.orderIndex,
    dueDate: parsed.data.dueDate,
  });
}

const UnassignSchema = z.object({ assignmentId: UuidSchema });

export async function unassign(input: z.input<typeof UnassignSchema>) {
  const parsed = UnassignSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: row, error: findErr } = await admin
    .from("lesson_assignments")
    .select("classroom_id, student_id, roster_student_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();
  if (findErr || !row) return { error: "Assignment not found" };

  const { error } = await admin
    .from("lesson_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId);
  if (error) return { error: error.message };

  bumpPaths(
    row.classroom_id as string,
    (row.student_id as string | null) ?? null,
    (row.roster_student_id as string | null) ?? null
  );
  return { success: true as const };
}

const ReorderSchema = z.object({
  classroomId: UuidSchema,
  studentId: UuidSchema,
  ordered: z.array(UuidSchema),
});

export async function reorderForStudent(input: z.input<typeof ReorderSchema>) {
  const parsed = ReorderSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  for (let i = 0; i < parsed.data.ordered.length; i++) {
    const id = parsed.data.ordered[i];
    const { error } = await admin
      .from("lesson_assignments")
      .update({ order_index: i })
      .eq("id", id);
    if (error) return { error: error.message };
  }

  bumpPaths(parsed.data.classroomId, parsed.data.studentId, null);
  return { success: true as const };
}

const StatusSchema = z.object({
  assignmentId: UuidSchema,
  status: z.enum(["assigned", "skipped", "completed"]),
});

export async function setAssignmentStatus(input: z.input<typeof StatusSchema>) {
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: row, error: findErr } = await admin
    .from("lesson_assignments")
    .select("classroom_id, student_id, roster_student_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();
  if (findErr || !row) return { error: "Assignment not found" };

  const { error } = await admin
    .from("lesson_assignments")
    .update({ status: parsed.data.status as AssignmentStatus })
    .eq("id", parsed.data.assignmentId);
  if (error) return { error: error.message };

  bumpPaths(
    row.classroom_id as string,
    (row.student_id as string | null) ?? null,
    (row.roster_student_id as string | null) ?? null
  );
  return { success: true as const };
}

export async function getAssignmentsForStudent(
  classroomId: string,
  studentId: string
): Promise<LessonAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .or(`student_id.is.null,student_id.eq.${studentId}`)
    .order("order_index", { ascending: true })
    .order("assigned_at", { ascending: false });
  return (data as LessonAssignment[] | null) ?? [];
}

export async function getAssignmentsForClassroom(
  classroomId: string
): Promise<LessonAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("assigned_at", { ascending: false });
  return (data as LessonAssignment[] | null) ?? [];
}

export async function getAssignmentsForRosterStudent(
  rosterStudentId: string
): Promise<(LessonAssignment & { roster_student_id: string | null })[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const { data: rs } = await admin
    .from("roster_students")
    .select("classroom_id")
    .eq("id", rosterStudentId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  const classroomId = rs?.classroom_id as string | null | undefined;

  let query;
  if (classroomId) {
    query = admin
      .from("lesson_assignments")
      .select("*")
      .or(
        `roster_student_id.eq.${rosterStudentId},and(classroom_id.eq.${classroomId},student_id.is.null,roster_student_id.is.null)`
      );
  } else {
    query = admin
      .from("lesson_assignments")
      .select("*")
      .eq("roster_student_id", rosterStudentId);
  }

  const { data } = await query.order("order_index", { ascending: true });
  return (
    (data as (LessonAssignment & { roster_student_id: string | null })[] | null) ??
    []
  );
}
