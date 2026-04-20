"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const QuickCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export async function createClassroomQuick(
  input: z.input<typeof QuickCreateSchema>
) {
  const parsed = QuickCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid name" as const };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data, error } = await supabase
    .from("classrooms")
    .insert({
      teacher_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/teacher");
  return {
    success: true as const,
    id: data.id as string,
    name: data.name as string,
  };
}

export async function createClassroom(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  const { data, error } = await supabase
    .from("classrooms")
    .insert({ teacher_id: user.id, name, description })
    .select()
    .single();

  if (error) return { error: error.message };

  redirect(`/teacher/classroom/${data.id}`);
}

export async function joinClassroom(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const inviteCode = (formData.get("inviteCode") as string).trim().toLowerCase();

  const { data: classroom, error: findError } = await supabase
    .from("classrooms")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (findError || !classroom) {
    return { error: "Invalid invite code. Please check and try again." };
  }

  const { error: existsError } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("classroom_id", classroom.id)
    .eq("student_id", user.id)
    .single();

  if (!existsError) {
    return { error: "You are already a member of this classroom." };
  }

  const { error: joinError } = await supabase
    .from("classroom_members")
    .insert({ classroom_id: classroom.id, student_id: user.id });

  if (joinError) return { error: joinError.message };

  revalidatePath("/student");
  redirect("/student");
}

export async function getTeacherClassrooms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("classrooms")
    .select("*, classroom_members(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getClassroomDetails(classroomId: string) {
  const supabase = await createClient();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", classroomId)
    .single();

  if (!classroom) return null;

  const { data: members } = await supabase
    .from("classroom_members")
    .select("student_id, joined_at, profiles(full_name, avatar_url)")
    .eq("classroom_id", classroomId);

  const { data: xpData } = await supabase
    .from("xp_events")
    .select("student_id, xp_amount")
    .eq("classroom_id", classroomId)
    .limit(50_000);

  const studentXp: Record<string, number> = {};
  xpData?.forEach((e) => {
    studentXp[e.student_id] = (studentXp[e.student_id] ?? 0) + e.xp_amount;
  });

  return {
    classroom,
    members:
      members?.map((m) => ({
        student_id: m.student_id,
        joined_at: m.joined_at,
        full_name: (m.profiles as unknown as { full_name: string })?.full_name ?? "Unknown",
        avatar_url: (m.profiles as unknown as { avatar_url: string | null })?.avatar_url,
        total_xp: studentXp[m.student_id] ?? 0,
      })) ?? [],
  };
}

export async function getStudentClassrooms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("classroom_members")
    .select("classroom_id, classrooms(id, name, description, invite_code, teacher_id, profiles(full_name))")
    .eq("student_id", user.id);

  return memberships?.map((m) => m.classrooms) ?? [];
}

const UuidSchema = z.string().uuid();

/**
 * Delete a classroom the caller owns. FK cascade handles the child
 * rows (classroom_members, lesson_assignments, lesson_progress,
 * xp_events, conversations, scheduled_classes, student_notes,
 * student_history). roster_students.classroom_id is ON DELETE SET
 * NULL — rostered students survive the classroom deletion and stay
 * linked to their teacher, so no data loss on the people side.
 *
 * Hard-coded safety check on the DB: we fetch the classroom row and
 * verify teacher_id === caller before deleting. RLS alone is not
 * enough — we want to surface a clean 'not yours' error instead of
 * a silent RLS noop.
 */
export async function deleteClassroom(input: {
  classroomId: string;
}): Promise<{ success: true } | { error: string }> {
  const parsed = UuidSchema.safeParse(input.classroomId);
  if (!parsed.success) return { error: "Invalid classroom id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, teacher_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!classroom) return { error: "Classroom not found" };
  if ((classroom as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "You don't own this classroom" };
  }

  const { error } = await admin
    .from("classrooms")
    .delete()
    .eq("id", parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/admin");
  return { success: true };
}
