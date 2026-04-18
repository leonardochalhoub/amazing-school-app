"use server";

import { getAllLessons } from "@/lib/content/loader";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";

/**
 * Returns every lesson a teacher can assign — static library content +
 * published teacher-authored drafts. Library lessons are normalized to
 * the LessonDraftMeta shape so the AssignLessonButton dropdown can show
 * them seamlessly.
 */
export async function getAssignableLessons(): Promise<LessonDraftMeta[]> {
  const published = await listLessonDrafts({ status: "published" });
  const library: LessonDraftMeta[] = getAllLessons().map((l) => ({
    slug: l.slug,
    course_id: "library",
    cefr_level: l.cefr_level as LessonDraftMeta["cefr_level"],
    category: l.category as LessonDraftMeta["category"],
    title: l.title,
    published: true,
    character_ids: [],
    updated_at: "",
    published_at: null,
    exercise_count: l.exercise_count,
    xp_reward: l.xp_reward,
    estimated_minutes: l.estimated_minutes,
  }));
  // Dedupe by slug — if a teacher has a published draft with the same
  // slug as a library item, prefer the draft (teacher customizations win).
  const seen = new Set<string>();
  const out: LessonDraftMeta[] = [];
  for (const l of [...published, ...library]) {
    if (seen.has(l.slug)) continue;
    seen.add(l.slug);
    out.push(l);
  }
  return out;
}
