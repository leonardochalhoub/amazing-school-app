import { z } from "zod";

const SlugSchema = z.string().min(1).max(160);

const AnswerSchema = z.union([
  z.object({ type: z.literal("discussion"), text: z.string().max(4000) }),
  z.object({
    type: z.literal("spot_the_grammar"),
    entries: z
      .array(z.object({ short: z.string(), full: z.string().max(200) }))
      .max(20),
  }),
  z.object({
    type: z.literal("translate_line"),
    text: z.string().max(600),
  }),
  z.object({
    type: z.literal("listen_and_fill"),
    text: z.string().max(200),
  }),
]);

export const SubmitSchema = z.object({
  lessonSlug: SlugSchema,
  exerciseIndex: z.number().int().min(0).max(100),
  answer: AnswerSchema,
});

export type SubmitExerciseInput = z.input<typeof SubmitSchema>;
export type ExerciseAnswer = z.infer<typeof AnswerSchema>;

export interface ExerciseResponseRow {
  id: string;
  lesson_slug: string;
  exercise_index: number;
  exercise_type: string;
  answer: ExerciseAnswer;
  created_at: string;
  updated_at: string;
}
