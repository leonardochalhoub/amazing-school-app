"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateSchema = z.object({
  classroomId: z.string().uuid(),
  rosterStudentId: z.string().uuid().optional(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().min(1).max(120).optional(),
});

export interface StudentInvitationRow {
  id: string;
  token: string;
  teacher_id: string;
  classroom_id: string;
  roster_student_id: string | null;
  email: string | null;
  display_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
}

export interface InvitationPreview {
  token: string;
  classroom: { id: string; name: string };
  teacher: { full_name: string };
  display_name: string | null;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
}

export async function createStudentInvitation(
  input: z.input<typeof CreateSchema>
) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify the teacher owns the classroom and (if given) the roster student.
  const admin = createAdminClient();
  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, teacher_id")
    .eq("id", parsed.data.classroomId)
    .maybeSingle();
  if (!classroom || classroom.teacher_id !== user.id) {
    return { error: "Classroom not found or not yours" };
  }
  if (parsed.data.rosterStudentId) {
    const { data: roster } = await admin
      .from("roster_students")
      .select("id, teacher_id, full_name, email")
      .eq("id", parsed.data.rosterStudentId)
      .maybeSingle();
    if (!roster || roster.teacher_id !== user.id) {
      return { error: "Roster student not found or not yours" };
    }
  }

  const { data, error } = await admin
    .from("student_invitations")
    .insert({
      teacher_id: user.id,
      classroom_id: parsed.data.classroomId,
      roster_student_id: parsed.data.rosterStudentId ?? null,
      email: parsed.data.email ?? null,
      display_name: parsed.data.displayName ?? null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/teacher/students/${parsed.data.rosterStudentId ?? ""}`);
  return { success: true as const, invitation: data as StudentInvitationRow };
}

export async function listMyInvitations(): Promise<StudentInvitationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("student_invitations")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  return (data as StudentInvitationRow[] | null) ?? [];
}

export async function revokeInvitation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase
    .from("student_invitations")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) return { error: error.message };
  return { success: true as const };
}

// Public read by token — returns minimal info so the /student/join page can
// show "You were invited to Classroom X by Teacher Y" before the student
// creates their account.
export async function previewInvitation(
  token: string
): Promise<InvitationPreview | { error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "Invalid token" };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_invitations")
    .select(
      "token, classroom_id, teacher_id, display_name, email, expires_at, accepted_at"
    )
    .eq("token", token)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Invitation not found" };
  if (data.accepted_at) return { error: "This invitation has already been used." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "This invitation has expired." };
  }

  const [{ data: classroom }, { data: teacherProfile }] = await Promise.all([
    admin
      .from("classrooms")
      .select("id, name")
      .eq("id", data.classroom_id as string)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("full_name")
      .eq("id", data.teacher_id as string)
      .maybeSingle(),
  ]);

  return {
    token: data.token as string,
    classroom: {
      id: (classroom?.id as string) ?? "",
      name: (classroom?.name as string) ?? "",
    },
    teacher: { full_name: (teacherProfile?.full_name as string) ?? "Your teacher" },
    display_name: (data.display_name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    expires_at: data.expires_at as string,
    accepted_at: data.accepted_at as string | null,
  };
}

// Called by an authenticated student with a token. Links them to the
// classroom (and roster, if specified). Safe to call multiple times — the
// invitation is marked accepted on the first call.
export async function claimInvitation(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "Invalid token" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("student_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!inv) return { error: "Invitation not found" };
  if (inv.accepted_at && inv.accepted_by_user_id !== user.id) {
    return { error: "This invitation has already been used." };
  }
  if (new Date(inv.expires_at as string).getTime() < Date.now()) {
    return { error: "This invitation has expired." };
  }

  // Ensure the signed-in user has a profile row with role=student.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    await admin.from("profiles").insert({
      id: user.id,
      full_name: inv.display_name ?? user.email?.split("@")[0] ?? "Student",
      role: "student",
    });
  }

  // If invitation references a roster student, merge that row's data onto the
  // new user (avatar, age/gender/notes/birthday carry over) and link it.
  let rosterData: {
    full_name?: string | null;
    age_group?: string | null;
    gender?: string | null;
    birthday?: string | null;
    has_avatar?: boolean | null;
  } = {};
  if (inv.roster_student_id) {
    const { data: roster } = await admin
      .from("roster_students")
      .select("full_name, age_group, gender, birthday, has_avatar, email")
      .eq("id", inv.roster_student_id as string)
      .maybeSingle();
    if (roster) {
      rosterData = roster;
      await admin
        .from("roster_students")
        .update({ auth_user_id: user.id })
        .eq("id", inv.roster_student_id as string);
    }
  }

  // Make sure profile has a sensible full_name (prefer roster name).
  const fullName =
    rosterData.full_name || inv.display_name || user.email?.split("@")[0] || "Student";
  await admin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  // Add to classroom (idempotent).
  const { error: memErr } = await admin
    .from("classroom_members")
    .upsert(
      {
        classroom_id: inv.classroom_id as string,
        student_id: user.id,
      },
      { onConflict: "classroom_id,student_id" }
    );
  if (memErr) return { error: memErr.message };

  // Mark invitation accepted.
  await admin
    .from("student_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: user.id,
    })
    .eq("id", inv.id as string);

  revalidatePath("/student");
  revalidatePath(`/teacher/classroom/${inv.classroom_id}`);
  return {
    success: true as const,
    classroomId: inv.classroom_id as string,
  };
}
