"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface CustomDrill {
  id: string;
  teacher_id: string;
  band: string | null;
  focus: string | null;
  target: string;
  pt_hint: string | null;
  is_public: boolean;
  updated_at: string;
}

export interface SaveCustomDrillInput {
  id?: string;
  band?: string | null;
  focus?: string | null;
  target: string;
  pt_hint?: string | null;
  is_public?: boolean;
}

type TeacherAuth =
  | { ok: true; user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"] extends infer U ? Exclude<U, null> : never; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string };

async function requireTeacher(): Promise<TeacherAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") return { ok: false, error: "Teachers only" };
  return { ok: true, user, admin };
}

export async function saveCustomDrill(
  input: SaveCustomDrillInput,
): Promise<{ id: string } | { error: string }> {
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const { user, admin } = auth;

  const target = input.target?.trim();
  if (!target || target.length < 2) {
    return { error: "Target phrase is required" };
  }
  if (target.length > 300) {
    return { error: "Target phrase is too long (max 300 characters)" };
  }

  const payload = {
    teacher_id: user.id,
    band: input.band?.trim() || null,
    focus: input.focus?.trim() || null,
    target,
    pt_hint: input.pt_hint?.trim() || null,
    is_public: input.is_public ?? false,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await admin
      .from("custom_speaking_drills")
      .update(payload)
      .eq("id", input.id)
      .eq("teacher_id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: error?.message ?? "Update failed" };
    revalidatePath("/speaking-lab/my-drills");
    revalidatePath("/speaking-lab");
    return { id: data.id as string };
  }

  const { data, error } = await admin
    .from("custom_speaking_drills")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };
  revalidatePath("/speaking-lab/my-drills");
  revalidatePath("/speaking-lab");
  return { id: data.id as string };
}

export async function deleteCustomDrill(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const { user, admin } = auth;
  const { error } = await admin
    .from("custom_speaking_drills")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/speaking-lab/my-drills");
  revalidatePath("/speaking-lab");
  return { success: true as const };
}

export async function listMyCustomDrills(): Promise<CustomDrill[]> {
  const auth = await requireTeacher();
  if (!auth.ok) return [];
  const { user, admin } = auth;
  const { data } = await admin
    .from("custom_speaking_drills")
    .select(
      "id, teacher_id, band, focus, target, pt_hint, is_public, updated_at",
    )
    .eq("teacher_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as CustomDrill[] | null) ?? [];
}

/**
 * List every drill this signed-in user can see: their own (teacher) or
 * public drills from a classroom's teacher (student).
 */
export async function listAvailableCustomDrills(): Promise<CustomDrill[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "teacher") {
    const { data } = await admin
      .from("custom_speaking_drills")
      .select(
        "id, teacher_id, band, focus, target, pt_hint, is_public, updated_at",
      )
      .eq("teacher_id", user.id)
      .order("updated_at", { ascending: false });
    return (data as CustomDrill[] | null) ?? [];
  }

  // Student: pull public drills from their teachers' classrooms.
  const { data: memberships } = await admin
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", user.id);
  const classroomIds = (memberships ?? []).map((m) => m.classroom_id as string);
  if (classroomIds.length === 0) return [];
  const { data: classrooms } = await admin
    .from("classrooms")
    .select("teacher_id")
    .in("id", classroomIds);
  const teacherIds = Array.from(
    new Set((classrooms ?? []).map((c) => c.teacher_id as string)),
  );
  if (teacherIds.length === 0) return [];
  const { data } = await admin
    .from("custom_speaking_drills")
    .select(
      "id, teacher_id, band, focus, target, pt_hint, is_public, updated_at",
    )
    .in("teacher_id", teacherIds)
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  return (data as CustomDrill[] | null) ?? [];
}
