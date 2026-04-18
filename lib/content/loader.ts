import lessonIndexRaw from "@/content/lessons/index.json";
import byCefrRaw from "@/content/lessons/by-cefr.json";
import { cefrDir, type CefrLevel, type Skill } from "./schema";

export type LessonMeta = {
  slug: string;
  title: string;
  category: Skill;
  level: "A1" | "A2" | "B1";
  cefr_level: CefrLevel;
  xp_reward: number;
  estimated_minutes: number;
  exercise_count: number;
  has_speaking_scene?: boolean;
  has_dialog_scene?: boolean;
  has_listening_scene?: boolean;
  has_reading_scene?: boolean;
};

export type Exercise = {
  id: string;
  type: "multiple_choice" | "fill_blank" | "matching";
  question?: string;
  options?: string[];
  correct?: number | string;
  pairs?: [string, string][];
  explanation?: string;
  hint_pt_br?: string;
};

export type Source = {
  url: string;
  title: string;
  license: "cc-by" | "cc-by-sa" | "cc-by-nc" | "public-domain" | "mit";
};

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  category: Skill;
  level: "A1" | "A2" | "B1";
  cefr_level: CefrLevel;
  xp_reward: number;
  estimated_minutes: number;
  exercises: Exercise[];
  summary_pt_br?: string;
  sources?: Source[];
  generator_model?: string;
  generated_at?: string;
};

const LESSON_INDEX: LessonMeta[] = lessonIndexRaw as LessonMeta[];
const BY_CEFR: Record<CefrLevel, string[]> = byCefrRaw as Record<CefrLevel, string[]>;

export function getAllLessons(): LessonMeta[] {
  return LESSON_INDEX;
}

export function getLessonsByCategory(category: Skill): LessonMeta[] {
  return LESSON_INDEX.filter((l) => l.category === category);
}

export function getLessonsByCefr(cefr: CefrLevel): LessonMeta[] {
  const slugs = BY_CEFR[cefr] ?? [];
  const slugSet = new Set(slugs);
  const ordered = slugs
    .map((slug) => LESSON_INDEX.find((l) => l.slug === slug))
    .filter((l): l is LessonMeta => Boolean(l));
  const extras = LESSON_INDEX.filter(
    (l) => l.cefr_level === cefr && !slugSet.has(l.slug)
  );
  return [...ordered, ...extras];
}

export function getLessonsByCefrAndSkill(
  cefr: CefrLevel,
  skill: Skill
): LessonMeta[] {
  return getLessonsByCefr(cefr).filter((l) => l.category === skill);
}

export function getCefrIndex(): Record<CefrLevel, string[]> {
  return BY_CEFR;
}

export function findMeta(slug: string): LessonMeta | null {
  return LESSON_INDEX.find((l) => l.slug === slug) ?? null;
}

export async function getLesson(slug: string): Promise<Lesson | null> {
  const meta = findMeta(slug);
  if (!meta) return null;
  try {
    const dir = cefrDir(meta.cefr_level);
    const mod = await import(
      `@/content/lessons/${dir}/${meta.category}/${slug}.json`
    );
    return (mod.default ?? mod) as Lesson;
  } catch {
    return null;
  }
}
