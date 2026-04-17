"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CEFR_LEVELS,
  SKILLS,
  CHARACTER_IDS,
  Lesson,
  type CefrLevel,
  type Skill,
} from "@/lib/content/schema";

export interface LessonDraftRow {
  slug: string;
  course_id: string;
  cefr_level: CefrLevel;
  category: Skill;
  title: string;
  content: Lesson;
  published: boolean;
  character_ids: string[];
  generated_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface LessonDraftMeta {
  slug: string;
  course_id: string;
  cefr_level: CefrLevel;
  category: Skill;
  title: string;
  published: boolean;
  character_ids: string[];
  updated_at: string;
  published_at: string | null;
  exercise_count: number;
  xp_reward: number;
  estimated_minutes: number;
}

const UpsertSchema = z.object({
  slug: z.string().min(1).max(120),
  courseId: z.string().min(1).max(120),
  lesson: Lesson,
  characterIds: z.array(z.enum(CHARACTER_IDS)).default([]),
  generatedBy: z.string().default("claude-opus"),
  overwrite: z.boolean().default(false),
});

async function requireTeacher(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") return null;
  return user.id;
}

export async function upsertLessonDraft(input: z.input<typeof UpsertSchema>) {
  const parsed = UpsertSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const teacherId = await requireTeacher();
  if (!teacherId) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { lesson, courseId, slug, characterIds, generatedBy, overwrite } = parsed.data;

  const row = {
    slug,
    course_id: courseId,
    cefr_level: lesson.cefr_level,
    category: lesson.category,
    title: lesson.title,
    content: lesson,
    character_ids: characterIds,
    generated_by: generatedBy,
    created_by: teacherId,
    updated_at: new Date().toISOString(),
  };

  if (overwrite) {
    const { error } = await admin
      .from("lesson_drafts")
      .upsert(row, { onConflict: "slug" });
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("lesson_drafts").insert(row);
    if (error) {
      if (error.code === "23505") return { error: "A draft with this slug already exists" };
      return { error: error.message };
    }
  }

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${slug}`);
  return { success: true as const };
}

const UpdateSchema = z.object({
  slug: z.string().min(1),
  lesson: Lesson.optional(),
  title: z.string().min(1).optional(),
  characterIds: z.array(z.enum(CHARACTER_IDS)).optional(),
});

export async function updateLessonDraft(input: z.input<typeof UpdateSchema>) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const teacherId = await requireTeacher();
  if (!teacherId) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.lesson) {
    patch.content = parsed.data.lesson;
    patch.title = parsed.data.lesson.title;
    patch.cefr_level = parsed.data.lesson.cefr_level;
    patch.category = parsed.data.lesson.category;
  }
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.characterIds !== undefined) patch.character_ids = parsed.data.characterIds;

  const { error } = await admin
    .from("lesson_drafts")
    .update(patch)
    .eq("slug", parsed.data.slug);
  if (error) return { error: error.message };

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${parsed.data.slug}`);
  return { success: true as const };
}

const PublishSchema = z.object({
  slug: z.string().min(1),
  published: z.boolean(),
});

export async function setDraftPublished(input: z.input<typeof PublishSchema>) {
  const parsed = PublishSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const teacherId = await requireTeacher();
  if (!teacherId) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("lesson_drafts")
    .update({
      published: parsed.data.published,
      published_at: parsed.data.published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", parsed.data.slug);

  if (error) return { error: error.message };

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${parsed.data.slug}`);
  revalidatePath("/student/lessons");
  return { success: true as const };
}

export async function deleteLessonDraft(slug: string) {
  const teacherId = await requireTeacher();
  if (!teacherId) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("lesson_drafts").delete().eq("slug", slug);
  if (error) return { error: error.message };

  revalidatePath("/teacher/lessons");
  return { success: true as const };
}

export async function listLessonDrafts(filters?: {
  courseId?: string;
  cefrLevel?: CefrLevel;
  category?: Skill;
  status?: "draft" | "published" | "all";
}): Promise<LessonDraftMeta[]> {
  const teacherId = await requireTeacher();
  if (!teacherId) return [];

  const admin = createAdminClient();
  let query = admin
    .from("lesson_drafts")
    .select(
      "slug, course_id, cefr_level, category, title, published, character_ids, updated_at, published_at, content"
    )
    .order("cefr_level", { ascending: true })
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (filters?.courseId) query = query.eq("course_id", filters.courseId);
  if (filters?.cefrLevel) query = query.eq("cefr_level", filters.cefrLevel);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.status === "draft") query = query.eq("published", false);
  if (filters?.status === "published") query = query.eq("published", true);

  const { data } = await query;
  if (!data) return [];

  return data.map((row) => {
    const content = row.content as Lesson;
    return {
      slug: row.slug as string,
      course_id: row.course_id as string,
      cefr_level: row.cefr_level as CefrLevel,
      category: row.category as Skill,
      title: row.title as string,
      published: row.published as boolean,
      character_ids: (row.character_ids as string[]) ?? [],
      updated_at: row.updated_at as string,
      published_at: row.published_at as string | null,
      exercise_count: content?.exercises?.length ?? 0,
      xp_reward: content?.xp_reward ?? 0,
      estimated_minutes: content?.estimated_minutes ?? 0,
    };
  });
}

export async function getLessonDraft(slug: string): Promise<LessonDraftRow | null> {
  const teacherId = await requireTeacher();
  if (!teacherId) {
    console.log("[getLessonDraft] not a teacher", { slug });
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lesson_drafts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.log("[getLessonDraft] db error", { slug, error: error.message });
    return null;
  }
  if (!data) {
    console.log("[getLessonDraft] no row", { slug });
    return null;
  }

  return data as LessonDraftRow;
}
