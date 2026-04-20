import { z } from "zod";

/**
 * Official skill categories a teacher can pick when authoring a
 * lesson. Used by the lesson builder, the content validator, and
 * the curriculum-report breakdown.
 *
 * - speaking / dialog — started as filter-only virtual skills but
 *   are now first-class category values so teachers can label a
 *   lesson by its practice mode directly.
 */
export const SKILLS = [
  "grammar",
  "vocabulary",
  "reading",
  "listening",
  "narrative",
  "speaking",
  "dialog",
] as const;
export const SKILL_SET = new Set<string>(SKILLS);

// Kept for backwards-compatibility with earlier filter code. The UI
// set is identical to SKILLS now that every option is a real
// category; exports stay so other modules don't need to change.
export const UI_SKILLS = SKILLS;
export type UISkill = (typeof UI_SKILLS)[number];
export const UI_SKILL_SET = SKILL_SET;

export const CEFR_LEVELS = [
  "a1.1", "a1.2",
  "a2.1", "a2.2",
  "b1.1", "b1.2",
  "b2.1", "b2.2",
  "c1.1", "c1.2",
  "c2.1", "c2.2",
  "y4.1", "y4.2",
] as const;
export const CEFR_SET = new Set<string>(CEFR_LEVELS);

/**
 * CEFR bands are the coarse grouping used in UI filters. Y4 is a
 * post-C2 specialization year focused on professional fluency.
 */
export const CEFR_BANDS = ["a1", "a2", "b1", "b2", "c1", "c2", "y4"] as const;
export type CefrBand = (typeof CEFR_BANDS)[number];
export const CEFR_BAND_SET = new Set<string>(CEFR_BANDS);
export const CEFR_BAND_LABEL: Record<CefrBand, string> = {
  a1: "A1 · Basic 1",
  a2: "A2 · Basic 2",
  b1: "B1 · Intermediate 1",
  b2: "B2 · Intermediate 2",
  c1: "C1 · Advanced 1",
  c2: "C2 · Advanced 2",
  y4: "Y4 · Professional",
};

export function cefrBandOf(level: string): CefrBand | undefined {
  const prefix = level.toLowerCase().split(".")[0];
  return (CEFR_BAND_SET.has(prefix) ? prefix : undefined) as CefrBand | undefined;
}

export type Skill = (typeof SKILLS)[number];
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const Skill = z.enum(SKILLS);
export const CefrLevel = z.enum(CEFR_LEVELS);

export const LegacyLevel = z.enum(["A1", "A2", "B1"]);

const BaseExercise = z.object({
  id: z.string().min(1),
  explanation: z.string().min(1),
  hint_pt_br: z.string().min(1),
});

export const MultipleChoiceExercise = BaseExercise.extend({
  type: z.literal("multiple_choice"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct: z.number().int().nonnegative(),
});

export const FillBlankExercise = BaseExercise.extend({
  type: z.literal("fill_blank"),
  question: z.string().min(1),
  correct: z.string().min(1),
});

export const MatchingExercise = BaseExercise.extend({
  type: z.literal("matching"),
  pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).min(2).max(8),
});

export const Exercise = z.discriminatedUnion("type", [
  MultipleChoiceExercise,
  FillBlankExercise,
  MatchingExercise,
]);
export type Exercise = z.infer<typeof Exercise>;

export const License = z.enum(["cc-by", "cc-by-sa", "cc-by-nc", "public-domain", "mit"]);

export const Source = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  license: License,
});
export type Source = z.infer<typeof Source>;

export const COURSE_YEAR_1_US = "year-1-us-english-2026" as const;
export const COURSES = [COURSE_YEAR_1_US] as const;
export const Course = z.enum(COURSES);
export type Course = (typeof COURSES)[number];

export const CHARACTER_IDS = [
  "maria",
  "tom",
  "mrs-johnson",
  "carlos",
  "dona-helena",
  "ana",
  "mr-park",
  "julia",
  "biscoito",
] as const;
export const CharacterId = z.enum(CHARACTER_IDS);
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const Lesson = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: Skill,
  level: LegacyLevel,
  cefr_level: CefrLevel,
  xp_reward: z.number().int().positive().max(500),
  estimated_minutes: z.number().int().min(5).max(180),
  exercises: z.array(Exercise).min(3),
  summary_pt_br: z.string().min(1).optional(),
  sources: z.array(Source).min(1).optional(),
  generator_model: z.string().optional(),
  generated_at: z.string().datetime().optional(),
  course_id: z.string().optional(),
  character_ids: z.array(CharacterId).optional(),
  hero_image: z.string().optional(),
});
export type Lesson = z.infer<typeof Lesson>;

export const LessonMeta = z.object({
  slug: z.string(),
  title: z.string(),
  category: Skill,
  level: LegacyLevel,
  cefr_level: CefrLevel,
  xp_reward: z.number().int(),
  estimated_minutes: z.number().int(),
  exercise_count: z.number().int().nonnegative(),
});
export type LessonMeta = z.infer<typeof LessonMeta>;

export function toMeta(l: Lesson): LessonMeta {
  return {
    slug: l.slug,
    title: l.title,
    category: l.category,
    level: l.level,
    cefr_level: l.cefr_level,
    xp_reward: l.xp_reward,
    estimated_minutes: l.estimated_minutes,
    exercise_count: l.exercises.length,
  };
}

export function cefrDir(cefr: CefrLevel): string {
  return cefr.replace(".", "-");
}
