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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getClassroomDetails(classroomId: string) {
  const supabase = await createClient();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", classroomId)
    .is("deleted_at", null)
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
    .select("id, teacher_id, deleted_at")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!classroom) return { error: "Classroom not found" };
  const c = classroom as {
    id: string;
    teacher_id: string;
    deleted_at: string | null;
  };
  if (c.teacher_id !== user.id) {
    return { error: "You don't own this classroom" };
  }
  if (c.deleted_at) return { error: "Classroom is already deleted" };

  // Materialize classroom-wide assignments as per-roster rows
  // BEFORE the soft-delete so each student's profile keeps showing
  // them even if some future flow (or legacy data) severs the
  // roster ⇄ classroom link. We INSERT one row per (student × cw
  // assignment), copying status/due_date/order so the new rows
  // look identical to per-student assignments.
  const [{ data: cwAssignments }, { data: rosterInClass }] = await Promise.all(
    [
      admin
        .from("lesson_assignments")
        .select("lesson_slug, status, due_date, assigned_by, order_index")
        .eq("id", parsed.data) // placeholder, replaced below
        .limit(0),
      admin
        .from("roster_students")
        .select("id")
        .eq("classroom_id", parsed.data)
        .is("deleted_at", null),
    ],
  );
  // Real fetch (replaces the limit-0 warm-up; keeping the dual
  // Promise.all shape for readability as we grow the cleanup).
  const { data: cwReal } = await admin
    .from("lesson_assignments")
    .select("lesson_slug, status, due_date, assigned_by, order_index")
    .eq("classroom_id", parsed.data)
    .is("student_id", null)
    .is("roster_student_id", null);
  void cwAssignments;
  const rosterIds = ((rosterInClass ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );
  if (rosterIds.length > 0 && (cwReal ?? []).length > 0) {
    const rows: Array<Record<string, unknown>> = [];
    for (const cw of cwReal ?? []) {
      for (const rid of rosterIds) {
        rows.push({
          classroom_id: parsed.data,
          lesson_slug: (cw as { lesson_slug: string }).lesson_slug,
          assigned_by:
            (cw as { assigned_by: string | null }).assigned_by ?? user.id,
          roster_student_id: rid,
          student_id: null,
          order_index:
            (cw as { order_index: number | null }).order_index ?? 0,
          status:
            (cw as { status: "assigned" | "skipped" | "completed" }).status ??
            "assigned",
          due_date: (cw as { due_date: string | null }).due_date ?? null,
        });
      }
    }
    // Duplicates (23505) on (classroom_id, lesson_slug, roster_student_id)
    // are fine — the row already exists per-student, nothing to copy.
    for (const row of rows) {
      const { error: insErr } = await admin
        .from("lesson_assignments")
        .insert(row);
      if (insErr && insErr.code !== "23505") {
        console.warn("[deleteClassroom] materialize row failed", insErr);
      }
    }
  }

  // Clear FUTURE scheduled meetings — they're planned events for a
  // classroom that's going away. Past meetings stay untouched so
  // the class log keeps the historical record, and because we
  // soft-delete the classroom below, the row is still joinable for
  // the classroom NAME those past rows display.
  const nowIso = new Date().toISOString();
  const { error: futureErr } = await admin
    .from("scheduled_classes")
    .delete()
    .eq("classroom_id", parsed.data)
    .gt("scheduled_at", nowIso);
  if (futureErr) {
    console.error("[deleteClassroom] future-meetings cleanup", futureErr);
    return { error: futureErr.message };
  }

  // Soft delete: stamp deleted_at instead of removing the row. Every
  // active-classroom query filters `deleted_at IS NULL`; every
  // historical surface joins classrooms(name) and still resolves
  // the original classroom name because the row lives on.
  const { error, count } = await admin
    .from("classrooms")
    .update({ deleted_at: nowIso }, { count: "exact" })
    .eq("id", parsed.data)
    .is("deleted_at", null);
  if (error) {
    console.error("[deleteClassroom]", error);
    return { error: error.message };
  }
  if (!count) {
    console.error("[deleteClassroom] update affected 0 rows", {
      classroomId: parsed.data,
    });
    return { error: "Delete didn't take effect. Try reloading the page." };
  }

  // Drop live classroom_members rows so students lose the
  // membership link on auth-user side. Roster rows stay pointing
  // at the soft-deleted classroom_id on purpose — that way
  // getAssignmentsForRosterStudent can still pull classroom-wide
  // assignments when the student opens their profile, and the
  // payment/history joins keep resolving the classroom name.
  // Active-classroom queries filter `deleted_at IS NULL` on the
  // classroom side, so the soft-deleted row hides from pickers
  // and lists without severing the historical link.
  await admin
    .from("classroom_members")
    .delete()
    .eq("classroom_id", parsed.data);

  // Invalidate every surface that lists classrooms.
  revalidatePath("/teacher");
  revalidatePath("/teacher/admin");
  revalidatePath("/teacher/classroom", "layout");
  revalidatePath("/owner/sysadmin");
  return { success: true };
}
