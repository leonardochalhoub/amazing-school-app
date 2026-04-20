"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveTeacherLesson } from "@/lib/actions/teacher-lessons";
import type {
  ExerciseBlock,
  TeacherLessonRow,
} from "@/lib/actions/teacher-lessons-types";

const CEFR_OPTIONS = [
  "a1.1",
  "a1.2",
  "a2.1",
  "a2.2",
  "b1.1",
  "b1.2",
  "b2.1",
  "b2.2",
  "c1.1",
  "c1.2",
];

const EXERCISE_TYPE_LABELS: Record<ExerciseBlock["type"], string> = {
  multiple_choice: "Multiple choice",
  fill_blank: "Fill in the blank",
  matching: "Matching pairs",
  translate_line: "Translate a line",
  discussion: "Open discussion",
  short_answer: "Short answer",
  reading_comprehension: "Reading comprehension",
  free_text: "Free response",
};

function emptyExercise(type: ExerciseBlock["type"]): ExerciseBlock {
  switch (type) {
    case "multiple_choice":
      return {
        type,
        question: "",
        options: ["", "", "", ""],
        correct_index: 0,
      };
    case "fill_blank":
      return { type, question: "", answer: "" };
    case "matching":
      return {
        type,
        prompt: "Match each item on the left with its pair on the right:",
        pairs: [
          { left: "", right: "" },
          { left: "", right: "" },
          { left: "", right: "" },
        ],
      };
    case "translate_line":
      return {
        type,
        prompt_en: "Translate this line to Portuguese:",
        prompt_pt: "Traduza esta linha para português:",
        excerpt: "",
      };
    case "discussion":
      return {
        type,
        prompt_en: "",
        prompt_pt: "",
        target_vocab: [],
      };
    case "short_answer":
      return { type, question: "" };
    case "reading_comprehension":
      return {
        type,
        passage: "",
        question: "",
        options: ["", "", "", ""],
        correct_index: 0,
      };
    case "free_text":
      return { type, prompt_en: "" };
  }
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface Props {
  initial?: TeacherLessonRow;
}

export function LessonBuilder({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cefr, setCefr] = useState(initial?.cefr_level ?? "a1.1");
  const [category, setCategory] = useState(initial?.category ?? "grammar");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [exercises, setExercises] = useState<ExerciseBlock[]>(
    initial?.exercises ?? []
  );

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!initial) setSlug(slugify(v));
  }

  function addExercise(type: ExerciseBlock["type"]) {
    setExercises((prev) => [...prev, emptyExercise(type)]);
  }

  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveExercise(i: number, dir: -1 | 1) {
    setExercises((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function updateExercise(i: number, next: ExerciseBlock) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? next : e)));
  }

  function save(asPublished: boolean) {
    if (!title.trim()) {
      toast.error("Add a title first.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required.");
      return;
    }
    startTransition(async () => {
      const r = await saveTeacherLesson({
        id: initial?.id,
        slug,
        title,
        description: description.trim() || undefined,
        cefr_level: cefr,
        category,
        exercises,
        published: asPublished,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.lesson) {
        toast.success(
          asPublished ? "Lesson published!" : "Draft saved."
        );
        setPublished(asPublished);
        if (!initial) {
          router.push(`/teacher/lessons/edit/${r.lesson.slug}`);
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {initial ? "Edit lesson" : "New lesson"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Name it, add exercise blocks, save as draft or publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(false)}
            disabled={pending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <Button
            size="sm"
            onClick={() => save(true)}
            disabled={pending}
            className="gap-1.5"
          >
            <BookOpen className="h-4 w-4" />
            {published ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-title">Title</Label>
              <Input
                id="lesson-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="My lesson title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-slug">URL slug</Label>
              <Input
                id="lesson-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="my-lesson-title"
                disabled={!!initial}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-cefr">CEFR level</Label>
              <select
                id="lesson-cefr"
                value={cefr}
                onChange={(e) => setCefr(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {CEFR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-cat">Category</Label>
              <select
                id="lesson-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="grammar">Grammar</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
                <option value="narrative">Narrative</option>
                <option value="speaking">Speaking</option>
                <option value="dialog">Dialog</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-desc">Short description</Label>
              <Input
                id="lesson-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Exercise blocks
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {exercises.length}
            </span>
          </h2>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No exercises yet. Use the buttons below to add one.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {exercises.map((ex, i) => (
              <li key={i}>
                <ExerciseEditor
                  exercise={ex}
                  index={i}
                  total={exercises.length}
                  onChange={(e) => updateExercise(i, e)}
                  onRemove={() => removeExercise(i)}
                  onMove={(dir) => moveExercise(i, dir)}
                />
              </li>
            ))}
          </ul>
        )}

        <AddBlockBar onAdd={addExercise} />
      </div>
    </div>
  );
}

function AddBlockBar({ onAdd }: { onAdd: (type: ExerciseBlock["type"]) => void }) {
  const types = Object.keys(EXERCISE_TYPE_LABELS) as ExerciseBlock["type"][];
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Plus className="mr-1 inline-block h-3.5 w-3.5" />
        Add an exercise block
      </p>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <Button
            key={t}
            size="sm"
            variant="outline"
            onClick={() => onAdd(t)}
            className="text-xs"
          >
            + {EXERCISE_TYPE_LABELS[t]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ExerciseEditor({
  exercise,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  exercise: ExerciseBlock;
  index: number;
  total: number;
  onChange: (e: ExerciseBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          #{index + 1} · {EXERCISE_TYPE_LABELS[exercise.type]}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {renderEditor(exercise, onChange)}
    </div>
  );
}

function renderEditor(
  ex: ExerciseBlock,
  onChange: (e: ExerciseBlock) => void
): React.ReactNode {
  if (ex.type === "multiple_choice" || ex.type === "reading_comprehension") {
    return <MultipleChoiceEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "fill_blank") {
    return <FillBlankEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "matching") {
    return <MatchingEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "translate_line") {
    return <TranslateEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "discussion") {
    return <DiscussionEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "short_answer") {
    return <ShortAnswerEditor ex={ex} onChange={onChange} />;
  }
  if (ex.type === "free_text") {
    return <FreeTextEditor ex={ex} onChange={onChange} />;
  }
  return null;
}

function MultipleChoiceEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "multiple_choice" | "reading_comprehension" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      {ex.type === "reading_comprehension" ? (
        <div className="space-y-1.5">
          <Label>Passage</Label>
          <textarea
            value={ex.passage}
            onChange={(e) => onChange({ ...ex, passage: e.target.value })}
            rows={5}
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label>Question</Label>
        <Input
          value={ex.question}
          onChange={(e) => onChange({ ...ex, question: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Options (click the radio for the correct answer)</Label>
        {ex.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${ex.type}`}
              checked={ex.correct_index === i}
              onChange={() => onChange({ ...ex, correct_index: i })}
              className="h-4 w-4 accent-primary"
            />
            <Input
              value={opt}
              onChange={(e) =>
                onChange({
                  ...ex,
                  options: ex.options.map((o, idx) =>
                    idx === i ? e.target.value : o
                  ),
                })
              }
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
            {ex.options.length > 2 ? (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...ex,
                    options: ex.options.filter((_, idx) => idx !== i),
                    correct_index:
                      ex.correct_index > i ? ex.correct_index - 1 : ex.correct_index,
                  })
                }
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove option"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {ex.options.length < 6 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({ ...ex, options: [...ex.options, ""] })
            }
            className="text-xs"
          >
            + Option
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FillBlankEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "fill_blank" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Question (use ___ to mark the blank)</Label>
        <Input
          value={ex.question}
          onChange={(e) => onChange({ ...ex, question: e.target.value })}
          placeholder="I ___ to school every day."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Correct answer</Label>
        <Input
          value={ex.answer}
          onChange={(e) => onChange({ ...ex, answer: e.target.value })}
          placeholder="go"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Hint (optional, pt-BR)</Label>
        <Input
          value={ex.hint_pt_br ?? ""}
          onChange={(e) => onChange({ ...ex, hint_pt_br: e.target.value })}
          placeholder="Presente simples"
        />
      </div>
    </div>
  );
}

function MatchingEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "matching" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Prompt</Label>
        <Input
          value={ex.prompt}
          onChange={(e) => onChange({ ...ex, prompt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Pairs</Label>
        {ex.pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={p.left}
              onChange={(e) =>
                onChange({
                  ...ex,
                  pairs: ex.pairs.map((pp, idx) =>
                    idx === i ? { ...pp, left: e.target.value } : pp
                  ),
                })
              }
              placeholder="English term"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              value={p.right}
              onChange={(e) =>
                onChange({
                  ...ex,
                  pairs: ex.pairs.map((pp, idx) =>
                    idx === i ? { ...pp, right: e.target.value } : pp
                  ),
                })
              }
              placeholder="Portuguese translation"
            />
            {ex.pairs.length > 2 ? (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...ex,
                    pairs: ex.pairs.filter((_, idx) => idx !== i),
                  })
                }
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {ex.pairs.length < 10 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({ ...ex, pairs: [...ex.pairs, { left: "", right: "" }] })
            }
            className="text-xs"
          >
            + Pair
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TranslateEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "translate_line" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Excerpt (English)</Label>
        <Input
          value={ex.excerpt}
          onChange={(e) => onChange({ ...ex, excerpt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Model answer (pt-BR)</Label>
        <Input
          value={ex.model_answer_pt ?? ""}
          onChange={(e) => onChange({ ...ex, model_answer_pt: e.target.value })}
        />
      </div>
    </div>
  );
}

function DiscussionEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "discussion" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Prompt (English)</Label>
        <textarea
          value={ex.prompt_en}
          onChange={(e) => onChange({ ...ex, prompt_en: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Prompt (Portuguese)</Label>
        <textarea
          value={ex.prompt_pt}
          onChange={(e) => onChange({ ...ex, prompt_pt: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>
    </div>
  );
}

function ShortAnswerEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "short_answer" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Question</Label>
        <Input
          value={ex.question}
          onChange={(e) => onChange({ ...ex, question: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Model answer (optional)</Label>
        <textarea
          value={ex.model_answer ?? ""}
          onChange={(e) => onChange({ ...ex, model_answer: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>
    </div>
  );
}

function FreeTextEditor({
  ex,
  onChange,
}: {
  ex: Extract<ExerciseBlock, { type: "free_text" }>;
  onChange: (e: ExerciseBlock) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Prompt (English)</Label>
        <textarea
          value={ex.prompt_en}
          onChange={(e) => onChange({ ...ex, prompt_en: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>
    </div>
  );
}
