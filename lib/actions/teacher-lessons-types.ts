import { z } from "zod";

// Single exercise block. Covers the same 9 types used on music pages,
// plus "reading_comprehension" and "free_text" for freeform lessons.
//
// All text fields allow empty strings (so draft saves don't fail mid-authoring)
// and generous upper bounds so long passages and rich prompts fit comfortably.
const LONG_TEXT = z.string().max(20000);
const MED_TEXT = z.string().max(5000);
const SHORT_TEXT = z.string().max(1000);

export const ExerciseBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple_choice"),
    question: MED_TEXT,
    options: z.array(SHORT_TEXT).min(2).max(10),
    correct_index: z.number().int().min(0).max(9),
    explanation: MED_TEXT.optional(),
    hint_pt_br: MED_TEXT.optional(),
  }),
  z.object({
    type: z.literal("fill_blank"),
    question: MED_TEXT,
    answer: SHORT_TEXT,
    before: SHORT_TEXT.optional(),
    after: SHORT_TEXT.optional(),
    hint_pt_br: MED_TEXT.optional(),
  }),
  z.object({
    type: z.literal("matching"),
    prompt: MED_TEXT,
    pairs: z
      .array(z.object({ left: SHORT_TEXT, right: SHORT_TEXT }))
      .min(2)
      .max(12),
  }),
  z.object({
    type: z.literal("translate_line"),
    prompt_en: MED_TEXT,
    prompt_pt: MED_TEXT,
    excerpt: MED_TEXT,
    model_answer_pt: MED_TEXT.optional(),
    teacher_note: MED_TEXT.optional(),
  }),
  z.object({
    type: z.literal("discussion"),
    prompt_en: MED_TEXT,
    prompt_pt: MED_TEXT,
    target_vocab: z.array(z.string().max(200)).max(20).default([]),
  }),
  z.object({
    type: z.literal("short_answer"),
    question: MED_TEXT,
    model_answer: LONG_TEXT.optional(),
    hint_pt_br: MED_TEXT.optional(),
  }),
  z.object({
    type: z.literal("reading_comprehension"),
    passage: LONG_TEXT,
    question: MED_TEXT,
    options: z.array(SHORT_TEXT).min(2).max(10),
    correct_index: z.number().int().min(0).max(9),
  }),
  z.object({
    type: z.literal("free_text"),
    prompt_en: LONG_TEXT,
    prompt_pt: LONG_TEXT.optional(),
  }),
]);

export type ExerciseBlock = z.infer<typeof ExerciseBlockSchema>;

export const TeacherLessonSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and dashes only"),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  cefr_level: z.string().max(10).optional(),
  category: z.string().max(40).optional(),
  /** Expected duration of the practice in minutes. Feeds the
      curriculum "Tempo estimado" column + certificate platform-
      hours estimate. Optional so drafts in progress still save. */
  estimated_minutes: z
    .number()
    .int()
    .min(1)
    .max(240)
    .optional(),
  exercises: z.array(ExerciseBlockSchema).max(50),
  published: z.boolean().optional(),
});

export type TeacherLessonInput = z.input<typeof TeacherLessonSchema>;

export interface TeacherLessonRow {
  id: string;
  teacher_id: string;
  slug: string;
  title: string;
  description: string | null;
  cefr_level: string | null;
  category: string | null;
  estimated_minutes: number | null;
  exercises: ExerciseBlock[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const MusicOverrideSchema = z.object({
  music_slug: z.string().min(1).max(120),
  sing_along: z
    .object({
      prompts: z.array(
        z.object({
          label_en: z.string().max(120),
          label_pt: z.string().max(120),
          lines: z.array(z.string().max(300)).min(1).max(10),
          start_seconds: z.number().int().min(0).max(3600),
          style: z.enum(["chorus", "verse", "bridge", "hook"]).optional(),
        })
      ).max(4),
    })
    .nullable(),
  exercises: z.array(z.unknown()).nullable(),
});

export type MusicOverrideInput = z.input<typeof MusicOverrideSchema>;

export interface MusicOverrideRow {
  id: string;
  teacher_id: string;
  music_slug: string;
  sing_along: { prompts: unknown[] } | null;
  exercises: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export const BankItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  cefr_level: z.string().max(10).optional(),
  tags: z.array(z.string().max(40)).max(10).default([]),
  exercise: ExerciseBlockSchema,
  is_public: z.boolean().optional(),
});

export type BankItemInput = z.input<typeof BankItemSchema>;

export interface BankItemRow {
  id: string;
  author_id: string;
  title: string;
  cefr_level: string | null;
  tags: string[];
  exercise: ExerciseBlock;
  is_public: boolean;
  uses_count: number;
  created_at: string;
  updated_at: string;
}
