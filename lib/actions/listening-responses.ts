"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SaveListeningArgs {
  lessonSlug: string;
  sceneId: string;
  responseText: string;
}

export async function saveListeningResponse(
  args: SaveListeningArgs,
): Promise<{ id: string } | { error: string }> {
  const { lessonSlug, sceneId, responseText } = args;
  if (!lessonSlug || !sceneId) return { error: "Missing lesson or scene id" };
  const text = responseText.trim();
  if (text.length < 5) return { error: "Please write a little more (min 5 chars)" };
  if (text.length > 4000) return { error: "Response too long (max 4000 chars)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listening_responses")
    .insert({
      student_id: user.id,
      lesson_slug: lessonSlug,
      scene_id: sceneId,
      response_text: text,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Save failed" };
  return { id: data.id as string };
}

export interface ListeningResponseRow {
  id: string;
  student_id: string;
  student_name: string;
  lesson_slug: string;
  scene_id: string;
  response_text: string;
  submitted_at: string;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
}

/**
 * List responses from students in classrooms owned by the current teacher.
 * Ordered by submission time descending. Unreviewed responses first
 * (reviewed_at IS NULL).
 */
export async function listTeacherListeningResponses(): Promise<
  ListeningResponseRow[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  // Find classrooms the user owns.
  const { data: classrooms } = await admin
    .from("classrooms")
    .select("id")
    .eq("teacher_id", user.id)
    .is("deleted_at", null);
  if (!classrooms || classrooms.length === 0) return [];
  const classroomIds = classrooms.map((c) => c.id as string);

  // Find students in those classrooms.
  const { data: members } = await admin
    .from("classroom_members")
    .select("student_id")
    .in("classroom_id", classroomIds);
  if (!members || members.length === 0) return [];
  const studentIds = Array.from(new Set(members.map((m) => m.student_id as string)));

  // Defensive: survive the table not existing yet (pre-migration 021).
  let responses: Array<Record<string, unknown>> | null = null;
  try {
    const res = await admin
      .from("listening_responses")
      .select(
        "id, student_id, lesson_slug, scene_id, response_text, submitted_at, teacher_feedback, teacher_score, reviewed_at",
      )
      .in("student_id", studentIds)
      .order("reviewed_at", { ascending: true, nullsFirst: true })
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (!res.error) responses = res.data as Array<Record<string, unknown>> | null;
  } catch {
    responses = null;
  }
  if (!responses) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", studentIds);
  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.id as string, (p.full_name as string | null) ?? "Student");
  }

  return (responses ?? []).map((r) => ({
    id: r.id as string,
    student_id: r.student_id as string,
    student_name: nameById.get(r.student_id as string) ?? "Student",
    lesson_slug: r.lesson_slug as string,
    scene_id: r.scene_id as string,
    response_text: r.response_text as string,
    submitted_at: r.submitted_at as string,
    teacher_feedback: (r.teacher_feedback as string | null) ?? null,
    teacher_score: (r.teacher_score as number | null) ?? null,
    reviewed_at: (r.reviewed_at as string | null) ?? null,
  }));
}

/**
 * Student-side read: list the logged-in student's own listening responses,
 * newest first. Includes teacher feedback/score when the teacher has
 * reviewed the submission.
 */
export async function listStudentListeningResponses(
  limit = 20,
): Promise<ListeningResponseRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  let responses: Array<Record<string, unknown>> = [];
  try {
    const res = await admin
      .from("listening_responses")
      .select(
        "id, student_id, lesson_slug, scene_id, response_text, submitted_at, teacher_feedback, teacher_score, reviewed_at",
      )
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    if (!res.error && res.data) responses = res.data as Array<Record<string, unknown>>;
  } catch {
    responses = [];
  }

  const fullName = user.user_metadata?.full_name as string | undefined;
  return responses.map((r) => ({
    id: r.id as string,
    student_id: r.student_id as string,
    student_name: fullName ?? "You",
    lesson_slug: r.lesson_slug as string,
    scene_id: r.scene_id as string,
    response_text: r.response_text as string,
    submitted_at: r.submitted_at as string,
    teacher_feedback: (r.teacher_feedback as string | null) ?? null,
    teacher_score: (r.teacher_score as number | null) ?? null,
    reviewed_at: (r.reviewed_at as string | null) ?? null,
  }));
}

export interface ReviewArgs {
  responseId: string;
  feedback: string;
  score: number;
}

export async function reviewListeningResponse(
  args: ReviewArgs,
): Promise<{ success: true } | { error: string }> {
  const { responseId, feedback, score } = args;
  if (!responseId) return { error: "Missing response id" };
  if (score < 0 || score > 100) return { error: "Score must be 0–100" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  // Verify the teacher owns the classroom containing this student.
  const { data: row } = await admin
    .from("listening_responses")
    .select("student_id")
    .eq("id", responseId)
    .maybeSingle();
  if (!row) return { error: "Response not found" };

  const { data: classrooms } = await admin
    .from("classrooms")
    .select("id")
    .eq("teacher_id", user.id)
    .is("deleted_at", null);
  const classroomIds = (classrooms ?? []).map((c) => c.id as string);
  if (classroomIds.length === 0) return { error: "No classrooms" };

  const { data: membership } = await admin
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", row.student_id as string)
    .in("classroom_id", classroomIds)
    .maybeSingle();
  if (!membership) return { error: "Not your student" };

  const { error } = await admin
    .from("listening_responses")
    .update({
      teacher_feedback: feedback.trim() || null,
      teacher_score: score,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", responseId);
  if (error) return { error: error.message };
  return { success: true as const };
}
