"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Save, Upload, Download, CheckCircle2, Circle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lesson, type CharacterId } from "@/lib/content/schema";
import type { LessonDraftRow } from "@/lib/actions/lesson-drafts";
import {
  updateLessonDraft,
  setDraftPublished,
} from "@/lib/actions/lesson-drafts";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  initial: LessonDraftRow;
}

export function LessonEditor({ initial }: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const [lesson, setLesson] = useState(initial.content);
  const [published, setPublished] = useState(initial.published);

  const t = locale === "pt-BR"
    ? {
        title: "Título",
        description: "Descrição",
        summaryPtBr: "Resumo (PT-BR)",
        xpReward: "XP",
        minutes: "Minutos",
        exercises: "Exercícios",
        save: "Salvar alterações",
        saving: "Salvando…",
        saved: "Salvo",
        publish: "Publicar",
        unpublish: "Despublicar",
        publishedLabel: "Publicado",
        draftLabel: "Rascunho",
        characters: "Personagens",
        noChanges: "Sem alterações",
      }
    : {
        title: "Title",
        description: "Description",
        summaryPtBr: "Summary (PT-BR)",
        xpReward: "XP",
        minutes: "Minutes",
        exercises: "Exercises",
        save: "Save changes",
        saving: "Saving…",
        saved: "Saved",
        publish: "Publish",
        unpublish: "Unpublish",
        publishedLabel: "Published",
        draftLabel: "Draft",
        characters: "Characters",
        noChanges: "No changes",
      };

  function setExerciseField(
    index: number,
    field: string,
    value: string | number
  ) {
    setLesson((prev) => {
      const next = structuredClone(prev);
      const ex = next.exercises[index] as Record<string, unknown>;
      ex[field] = value;
      return next;
    });
  }

  function save() {
    const parsed = Lesson.safeParse(lesson);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid lesson");
      return;
    }
    startTransition(async () => {
      const result = await updateLessonDraft({
        slug: initial.slug,
        lesson: parsed.data,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.saved);
        router.refresh();
      }
    });
  }

  function togglePublish() {
    const next = !published;
    startTransition(async () => {
      const result = await setDraftPublished({ slug: initial.slug, published: next });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setPublished(next);
        toast.success(next ? t.publishedLabel : t.draftLabel);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {lesson.title}
            </h1>
            {published ? (
              <Badge variant="default" className="gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" />
                {t.publishedLabel}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Circle className="h-3 w-3" />
                {t.draftLabel}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {initial.cefr_level.toUpperCase()} · {initial.category} ·{" "}
            <span className="font-mono">{initial.slug}</span>
          </p>
          {initial.character_ids.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t.characters}:{" "}
              {initial.character_ids.map((id: string) => (
                <span key={id} className="mr-1 font-mono">
                  {id}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/teacher/lessons/${initial.slug}/preview`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            {locale === "pt-BR" ? "Ver como aluno" : "View as student"}
          </Link>
          <Button onClick={save} disabled={pending} className="gap-1.5">
            <Save className="h-4 w-4" />
            {pending ? t.saving : t.save}
          </Button>
          <Button
            variant={published ? "outline" : "default"}
            onClick={togglePublish}
            disabled={pending}
            className="gap-1.5"
          >
            {published ? (
              <>
                <Download className="h-4 w-4" />
                {t.unpublish}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t.publish}
              </>
            )}
          </Button>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="l-title">{t.title}</Label>
            <Input
              id="l-title"
              value={lesson.title}
              onChange={(e) => setLesson((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-xp">{t.xpReward}</Label>
              <Input
                id="l-xp"
                type="number"
                value={lesson.xp_reward}
                onChange={(e) =>
                  setLesson((p) => ({
                    ...p,
                    xp_reward: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-min">{t.minutes}</Label>
              <Input
                id="l-min"
                type="number"
                value={lesson.estimated_minutes}
                onChange={(e) =>
                  setLesson((p) => ({
                    ...p,
                    estimated_minutes: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-desc">{t.description}</Label>
          <textarea
            id="l-desc"
            value={lesson.description}
            onChange={(e) =>
              setLesson((p) => ({ ...p, description: e.target.value }))
            }
            className="min-h-[70px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-sum">{t.summaryPtBr}</Label>
          <textarea
            id="l-sum"
            value={lesson.summary_pt_br ?? ""}
            onChange={(e) =>
              setLesson((p) => ({ ...p, summary_pt_br: e.target.value }))
            }
            className="min-h-[60px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t.exercises} ({lesson.exercises.length})
        </h2>
        <div className="space-y-3">
          {lesson.exercises.map((ex, i) => (
            <ExerciseEditor
              key={ex.id}
              index={i}
              exercise={ex}
              onChange={(field, value) => setExerciseField(i, field, value)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ExerciseEditor({
  index,
  exercise,
  onChange,
}: {
  index: number;
  exercise: Lesson["exercises"][number];
  onChange: (field: string, value: string | number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          #{index + 1} · {exercise.type}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {exercise.id}
        </span>
      </div>
      {"question" in exercise ? (
        <div className="space-y-1.5">
          <Label htmlFor={`ex-q-${index}`}>Question</Label>
          <textarea
            id={`ex-q-${index}`}
            value={exercise.question}
            onChange={(e) => onChange("question", e.target.value)}
            className="min-h-[44px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
      ) : null}
      {exercise.type === "multiple_choice" ? (
        <div className="mt-2 space-y-1.5">
          <Label>Options</Label>
          <pre className="rounded-md border border-border bg-muted/40 p-2 text-xs">
            {JSON.stringify(exercise.options, null, 2)}
          </pre>
          <p className="text-[11px] text-muted-foreground">
            Correct: option #{exercise.correct}
          </p>
        </div>
      ) : null}
      {exercise.type === "fill_blank" ? (
        <p className="mt-2 text-xs">
          <span className="text-muted-foreground">Correct: </span>
          <span className="font-mono">{exercise.correct}</span>
        </p>
      ) : null}
      {exercise.type === "matching" ? (
        <div className="mt-2 space-y-1.5">
          <Label>Pairs</Label>
          <pre className="rounded-md border border-border bg-muted/40 p-2 text-xs">
            {JSON.stringify(exercise.pairs, null, 2)}
          </pre>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`ex-exp-${index}`}>Explanation (EN)</Label>
          <textarea
            id={`ex-exp-${index}`}
            value={exercise.explanation}
            onChange={(e) => onChange("explanation", e.target.value)}
            className="min-h-[60px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`ex-hint-${index}`}>Hint (PT-BR)</Label>
          <textarea
            id={`ex-hint-${index}`}
            value={exercise.hint_pt_br}
            onChange={(e) => onChange("hint_pt_br", e.target.value)}
            className="min-h-[60px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
