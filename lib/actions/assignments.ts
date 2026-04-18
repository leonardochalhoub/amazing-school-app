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

const BulkManySchema = z.object({
  classroomId: UuidSchema,
  lessonSlugs: z.array(SlugSchema).min(1).max(60),
  studentId: UuidSchema.nullable().optional(),
  rosterStudentId: UuidSchema.nullable().optional(),
});

/**
 * Assigns MANY lessons to ONE target in a single round-trip. Duplicate
 * assignments (unique violation 23505) are counted as 'skipped' rather
 * than failing the whole batch — re-assigning a lesson that's already
 * there shouldn't tear everything down.
 */
export async function bulkAssignManyLessons(
  input: z.input<typeof BulkManySchema>
): Promise<
  | { success: true; assigned: number; skipped: number }
  | { error: string }
> {
  const parsed = BulkManySchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (parsed.data.studentId && parsed.data.rosterStudentId) {
    return { error: "Provide only one of studentId or rosterStudentId" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const rows = parsed.data.lessonSlugs.map((slug, i) => ({
    classroom_id: parsed.data.classroomId,
    lesson_slug: slug,
    student_id: parsed.data.studentId ?? null,
    roster_student_id: parsed.data.rosterStudentId ?? null,
    order_index: i,
    assigned_by: user.id,
  }));

  let assigned = 0;
  let skipped = 0;
  // Insert one at a time so duplicates don't kill the batch.
  for (const row of rows) {
    const { error } = await admin.from("lesson_assignments").insert(row);
    if (!error) assigned += 1;
    else if (error.code === "23505") skipped += 1;
    else return { error: error.message };
  }

  bumpPaths(
    parsed.data.classroomId,
    parsed.data.studentId ?? null,
    parsed.data.rosterStudentId ?? null
  );
  return { success: true, assigned, skipped };
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
  // Use the admin client so we don't lose rows to RLS edge cases (e.g. a
  // student who was invited but whose classroom_members row isn't indexed
  // in the RLS subquery yet). Authorization is via the studentId argument.
  const admin = createAdminClient();

  // If the user was signed up via a roster invite, there's a roster_students
  // row linked via auth_user_id. Assignments targeting that roster row
  // (made before signup) need to be included.
  const { data: rosterLink } = await admin
    .from("roster_students")
    .select("id")
    .eq("auth_user_id", studentId)
    .maybeSingle();
  const rosterId = (rosterLink as { id: string } | null)?.id ?? null;

  // Build three separate queries and union. This is cleaner than a single
  // OR with nested and() — PostgREST's OR grammar is picky about embedded
  // logical groups.
  const classroomWide = admin
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .is("student_id", null)
    .is("roster_student_id", null);

  const perUser = admin
    .from("lesson_assignments")
    .select("*")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId);

  const perRoster = rosterId
    ? admin
        .from("lesson_assignments")
        .select("*")
        .eq("classroom_id", classroomId)
        .eq("roster_student_id", rosterId)
    : Promise.resolve({ data: [] as LessonAssignment[] });

  const [cw, pu, pr] = await Promise.all([classroomWide, perUser, perRoster]);
  const merged: LessonAssignment[] = [
    ...((cw.data as LessonAssignment[] | null) ?? []),
    ...((pu.data as LessonAssignment[] | null) ?? []),
    ...((pr.data as LessonAssignment[] | null) ?? []),
  ];

  // Dedupe by id (in case a row somehow matches two branches).
  const seen = new Set<string>();
  const unique = merged.filter((a) => {
    const id = (a as { id: string }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Sort: earliest order_index first, then most recently assigned.
  unique.sort((a, b) => {
    const ao = (a as { order_index?: number }).order_index ?? 0;
    const bo = (b as { order_index?: number }).order_index ?? 0;
    if (ao !== bo) return ao - bo;
    return (
      new Date((b as { assigned_at: string }).assigned_at).getTime() -
      new Date((a as { assigned_at: string }).assigned_at).getTime()
    );
  });

  return unique;
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
