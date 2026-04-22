"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  MusicOverrideSchema,
  type MusicOverrideInput,
  type MusicOverrideRow,
} from "@/lib/actions/teacher-lessons-types";

export async function upsertMusicOverride(input: MusicOverrideInput) {
  const parsed = MusicOverrideSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("teacher_music_overrides")
    .upsert(
      {
        teacher_id: user.id,
        music_slug: parsed.data.music_slug,
        sing_along: parsed.data.sing_along,
        exercises: parsed.data.exercises,
      },
      { onConflict: "teacher_id,music_slug" }
    )
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/student/music/${parsed.data.music_slug}`);
  revalidatePath(`/teacher/music/${parsed.data.music_slug}`);
  return { success: true as const, override: data as MusicOverrideRow };
}

export async function getMyMusicOverride(
  musicSlug: string
): Promise<MusicOverrideRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("teacher_music_overrides")
    .select("*")
    .eq("teacher_id", user.id)
    .eq("music_slug", musicSlug)
    .maybeSingle();
  return (data as MusicOverrideRow | null) ?? null;
}

/**
 * All music overrides authored by the current teacher, newest first.
 * Used by the "My Songs" tab on /teacher/bank to let the teacher
 * jump back into any personalized song or share it to the bank.
 */
export async function listMyMusicOverrides(): Promise<
  Array<{
    music_slug: string;
    has_override: boolean;
    is_in_bank: boolean;
    updated_at: string;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const { data: overrides } = await admin
    .from("teacher_music_overrides")
    .select("music_slug, updated_at")
    .eq("teacher_id", user.id)
    .order("updated_at", { ascending: false });
  const rows = (overrides ?? []) as Array<{
    music_slug: string;
    updated_at: string;
  }>;
  if (rows.length === 0) return [];

  // Tag each override with whether it's already in the lesson bank
  // so the UI can render "Shared" vs "Share to bank" directly.
  const { data: bank } = await admin
    .from("lesson_bank_entries")
    .select("music_slug")
    .eq("author_id", user.id)
    .eq("kind", "music")
    .is("deleted_at", null);
  const shared = new Set<string>(
    ((bank ?? []) as Array<{ music_slug: string | null }>)
      .map((b) => b.music_slug)
      .filter((x): x is string => !!x),
  );

  return rows.map((r) => ({
    music_slug: r.music_slug,
    has_override: true,
    is_in_bank: shared.has(r.music_slug),
    updated_at: r.updated_at,
  }));
}

export async function resetMusicOverride(musicSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase
    .from("teacher_music_overrides")
    .delete()
    .eq("teacher_id", user.id)
    .eq("music_slug", musicSlug);
  if (error) return { error: error.message };
  revalidatePath(`/student/music/${musicSlug}`);
  revalidatePath(`/teacher/music/${musicSlug}`);
  return { success: true as const };
}

// Used by student-facing music page: if a teacher of any classroom this viewer
// is in has an override, prefer it over the canonical song data. Also: if the
// viewer IS a teacher who authored an override for this song, show their own
// (so they can preview their own edits on the student-facing page).
export async function getOverrideForStudent(
  musicSlug: string
): Promise<MusicOverrideRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Own override — teacher previewing their own work.
  const { data: own } = await supabase
    .from("teacher_music_overrides")
    .select("*")
    .eq("music_slug", musicSlug)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (own) return own as MusicOverrideRow;

  // 2. Override authored by any teacher whose classroom the viewer is in.
  const { data: memberships } = await supabase
    .from("classroom_members")
    .select("classroom_id, classrooms(teacher_id)")
    .eq("student_id", user.id);

  const teacherIds = (memberships ?? [])
    .map((m) => {
      const c = (m as { classrooms: { teacher_id: string } | { teacher_id: string }[] | null })
        .classrooms;
      if (!c) return null;
      if (Array.isArray(c)) return c[0]?.teacher_id ?? null;
      return c.teacher_id;
    })
    .filter((x): x is string => !!x);

  if (teacherIds.length === 0) return null;

  const { data } = await supabase
    .from("teacher_music_overrides")
    .select("*")
    .eq("music_slug", musicSlug)
    .in("teacher_id", teacherIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as MusicOverrideRow | null) ?? null;
}
