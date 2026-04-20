"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AssignmentStatus, LessonAssignment } from "@/lib/supabase/types";

const UuidSchema = z.string().uuid();
const SlugSchema = z.string().min(1).max(120);

const AssignSchema = z
  .object({
    classroomId: UuidSchema.nullable().optional(),
    lessonSlug: SlugSchema,
    studentId: UuidSchema.nullable().optional(),
    rosterStudentId: UuidSchema.nullable().optional(),
    orderIndex: z.number().int().min(0).default(0),
    dueDate: z.string().datetime().optional(),
  })
  .refine(
    (d) => !!(d.classroomId || d.studentId || d.rosterStudentId),
    { message: "Provide a classroom, a student, or a roster student" },
  );

export type AssignInput = z.input<typeof AssignSchema>;

function bumpPaths(
  classroomId: string | null,
  studentId: string | null,
  rosterStudentId: string | null
) {
  if (classroomId) revalidatePath(`/teacher/classroom/${classroomId}`);
  if (classroomId && studentId) {
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
    classroom_id: parsed.data.classroomId ?? null,
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
    parsed.data.classroomId ?? null,
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

const BulkManySchema = z
  .object({
    classroomId: UuidSchema.nullable().optional(),
    lessonSlugs: z.array(SlugSchema).min(1).max(60),
    studentId: UuidSchema.nullable().optional(),
    rosterStudentId: UuidSchema.nullable().optional(),
  })
  .refine(
    (d) => !!(d.classroomId || d.studentId || d.rosterStudentId),
    { message: "Provide a classroom, a student, or a roster student" },
  );

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
    classroom_id: parsed.data.classroomId ?? null,
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
    parsed.data.classroomId ?? null,
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
  classroomId: string | null,
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

  // Classroom-scoped branches only run when the student actually has one.
  // Classroom-less students still see any per-user or per-roster assignment
  // targeted at them directly (migration 024 lets classroom_id be null).
  const classroomWide = classroomId
    ? admin
        .from("lesson_assignments")
        .select("*")
        .eq("classroom_id", classroomId)
        .is("student_id", null)
        .is("roster_student_id", null)
    : Promise.resolve({ data: [] as LessonAssignment[] });

  const perUser = admin
    .from("lesson_assignments")
    .select("*")
    .eq("student_id", studentId);

  const perRoster = rosterId
    ? admin
        .from("lesson_assignments")
        .select("*")
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

  // Verify the roster row belongs to the teacher. We then return two
  // buckets merged:
  //   (a) assignments targeted directly at this roster student
  //   (b) classroom-wide rows in this student's classroom
  // Classroom-wide lessons ARE this student's work (everyone in the
  // class got them) and must appear on the per-student profile too.
  const { data: rs } = await admin
    .from("roster_students")
    .select("id, classroom_id, auth_user_id")
    .eq("id", rosterStudentId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!rs) return [];
  const rosterRow = rs as {
    id: string;
    classroom_id: string | null;
    auth_user_id: string | null;
  };

  // Collect every classroom the student has EVER been in. Historical
  // rows pin the student to a classroom implicitly:
  //   - their roster.classroom_id (current)
  //   - lesson_progress rows (auth user finished work in a classroom)
  //   - student_history entries authored for them
  // Without this union, classroom-wide assignments disappear once a
  // student's roster.classroom_id gets nulled — which used to happen
  // on classroom delete before c47c8ac, and could also happen if a
  // teacher manually moves the student to "no classroom".
  const classroomIds = new Set<string>();
  if (rosterRow.classroom_id) classroomIds.add(rosterRow.classroom_id);

  const [progressClassrooms, historyClassrooms] = await Promise.all([
    rosterRow.auth_user_id
      ? admin
          .from("lesson_progress")
          .select("classroom_id")
          .eq("student_id", rosterRow.auth_user_id)
          .not("classroom_id", "is", null)
          .limit(10_000)
      : Promise.resolve({ data: [] as { classroom_id: string | null }[] }),
    admin
      .from("student_history")
      .select("classroom_id")
      .eq("roster_student_id", rosterStudentId)
      .not("classroom_id", "is", null)
      .limit(1_000),
  ]);
  for (const r of progressClassrooms.data ?? []) {
    const cid = (r as { classroom_id: string | null }).classroom_id;
    if (cid) classroomIds.add(cid);
  }
  for (const r of historyClassrooms.data ?? []) {
    const cid = (r as { classroom_id: string | null }).classroom_id;
    if (cid) classroomIds.add(cid);
  }

  const perRosterPromise = admin
    .from("lesson_assignments")
    .select("*")
    .eq("roster_student_id", rosterStudentId);

  const classroomWidePromise =
    classroomIds.size > 0
      ? admin
          .from("lesson_assignments")
          .select("*")
          .in("classroom_id", [...classroomIds])
          .is("student_id", null)
          .is("roster_student_id", null)
      : Promise.resolve({ data: [] as LessonAssignment[] });

  const [perRoster, classroomWide] = await Promise.all([
    perRosterPromise,
    classroomWidePromise,
  ]);

  const merged = [
    ...((perRoster.data as (LessonAssignment & {
      roster_student_id: string | null;
    })[] | null) ?? []),
    ...((classroomWide.data as (LessonAssignment & {
      roster_student_id: string | null;
    })[] | null) ?? []),
  ];
  // Dedupe by assignment row id only. Teachers may legitimately
  // assign the same lesson both classroom-wide AND to a specific
  // student (explicit per-student override), and the student list
  // should reflect both entries. The trash icon on each row lets
  // the teacher remove any accidental duplicate directly.
  const seen = new Set<string>();
  const unique = merged.filter((a) => {
    const id = (a as { id: string }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  // Sort by assignment time descending so the list / recent-10 window
  // shows the newest first (matches AssignedLessonsList expectations).
  unique.sort(
    (a, b) =>
      new Date((b as { assigned_at: string }).assigned_at).getTime() -
      new Date((a as { assigned_at: string }).assigned_at).getTime(),
  );
  return unique;
}
