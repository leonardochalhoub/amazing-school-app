"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MusicOverrideSchema } from "@/lib/actions/teacher-lessons-types";

const SingAlongSchema = MusicOverrideSchema.shape.sing_along;

const CreateSchema = z
  .object({
    musicSlug: z.string().min(1).max(120),
    message: z.string().max(2000).optional(),
    singAlong: SingAlongSchema.optional(),
    lyricNote: z.string().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.singAlong != null || (v.lyricNote && v.lyricNote.trim().length > 0),
    { message: "Provide at least one of: sing_along or lyric_note." }
  );

export interface MusicSuggestionRow {
  id: string;
  student_id: string;
  teacher_id: string;
  classroom_id: string;
  music_slug: string;
  message: string | null;
  sing_along: { prompts: unknown[] } | null;
  lyric_note: string | null;
  status: "pending" | "accepted" | "rejected";
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
}

// --- Student-facing ---

export async function createMusicSuggestion(
  input: z.input<typeof CreateSchema>
) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to send a suggestion." };

  // Find the student's classroom + teacher.
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("classroom_members")
    .select("classroom_id, classrooms(teacher_id)")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "Join a classroom before sending suggestions." };
  }
  const raw = (membership as {
    classroom_id: string;
    classrooms:
      | { teacher_id: string }
      | { teacher_id: string }[]
      | null;
  }).classrooms;
  const teacherId = Array.isArray(raw) ? raw[0]?.teacher_id : raw?.teacher_id;
  if (!teacherId) return { error: "Classroom has no teacher." };

  const { data, error } = await admin
    .from("music_suggestions")
    .insert({
      student_id: user.id,
      teacher_id: teacherId,
      classroom_id: (membership as { classroom_id: string }).classroom_id,
      music_slug: parsed.data.musicSlug,
      message: parsed.data.message ?? null,
      sing_along: parsed.data.singAlong ?? null,
      lyric_note: parsed.data.lyricNote ?? null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/teacher/music/${parsed.data.musicSlug}/edit`);
  return { success: true as const, suggestion: data as MusicSuggestionRow };
}

export async function listMyMusicSuggestions(
  musicSlug?: string
): Promise<MusicSuggestionRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase
    .from("music_suggestions")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });
  if (musicSlug) q = q.eq("music_slug", musicSlug);
  const { data } = await q;
  return (data as MusicSuggestionRow[] | null) ?? [];
}

// --- Teacher-facing ---

export async function listTeacherPendingSuggestions(
  musicSlug?: string
): Promise<MusicSuggestionRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase
    .from("music_suggestions")
    .select("*")
    .eq("teacher_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (musicSlug) q = q.eq("music_slug", musicSlug);
  const { data } = await q;
  return (data as MusicSuggestionRow[] | null) ?? [];
}

export async function reviewMusicSuggestion(input: {
  suggestionId: string;
  decision: "accepted" | "rejected";
  reviewerNote?: string;
}) {
  const DecisionSchema = z.object({
    suggestionId: z.string().uuid(),
    decision: z.enum(["accepted", "rejected"]),
    reviewerNote: z.string().max(2000).optional(),
  });
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: suggestion } = await admin
    .from("music_suggestions")
    .select("*")
    .eq("id", parsed.data.suggestionId)
    .maybeSingle();
  if (!suggestion) return { error: "Suggestion not found" };
  if ((suggestion as { teacher_id: string }).teacher_id !== user.id)
    return { error: "Not yours to review" };
  if ((suggestion as { status: string }).status !== "pending")
    return { error: "Already reviewed" };

  // Update suggestion row
  const { error: updErr } = await admin
    .from("music_suggestions")
    .update({
      status: parsed.data.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewer_note: parsed.data.reviewerNote ?? null,
    })
    .eq("id", parsed.data.suggestionId);
  if (updErr) return { error: updErr.message };

  // On accept: merge the suggestion's sing_along into the teacher's
  // music override (create override if none exists).
  const row = suggestion as MusicSuggestionRow;
  if (parsed.data.decision === "accepted" && row.sing_along) {
    const { data: existing } = await admin
      .from("teacher_music_overrides")
      .select("exercises")
      .eq("teacher_id", user.id)
      .eq("music_slug", row.music_slug)
      .maybeSingle();
    await admin
      .from("teacher_music_overrides")
      .upsert(
        {
          teacher_id: user.id,
          music_slug: row.music_slug,
          sing_along: row.sing_along,
          exercises:
            (existing as { exercises: unknown[] | null } | null)?.exercises ??
            null,
        },
        { onConflict: "teacher_id,music_slug" }
      );
  }

  revalidatePath(`/teacher/music/${row.music_slug}/edit`);
  revalidatePath(`/student/music/${row.music_slug}`);
  return { success: true as const };
}
