import lessonIndex from "@/content/lessons/index.json";

export type LessonMeta = {
  slug: string;
  title: string;
  category: string;
  level: string;
  xp_reward: number;
  estimated_minutes: number;
  exercise_count: number;
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

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  xp_reward: number;
  estimated_minutes: number;
  exercises: Exercise[];
};

export function getAllLessons(): LessonMeta[] {
  return lessonIndex as LessonMeta[];
}

export function getLessonsByCategory(category: string): LessonMeta[] {
  return (lessonIndex as LessonMeta[]).filter((l) => l.category === category);
}

export async function getLesson(slug: string): Promise<Lesson | null> {
  const meta = (lessonIndex as LessonMeta[]).find((l) => l.slug === slug);
  if (!meta) return null;
  try {
    const mod = await import(
      `@/content/lessons/${meta.category}/${slug}.json`
    );
    return (mod.default ?? mod) as Lesson;
  } catch {
    return null;
  }
}
