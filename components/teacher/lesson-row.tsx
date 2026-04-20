"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  FileEdit,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";
import {
  setDraftPublished,
  deleteLessonDraft,
} from "@/lib/actions/lesson-drafts";

const CEFR_PILL: Record<string, string> = {
  "a1.1": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  "a1.2": "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  "a2.1": "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  "a2.2": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "b1.1": "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  "b1.2": "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

const SKILL_LABELS = {
  en: {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    reading: "Reading",
    listening: "Listening",
    narrative: "Narrative",
    speaking: "Speaking",
    dialog: "Dialog",
  },
  pt: {
    grammar: "Gramática",
    vocabulary: "Vocabulário",
    reading: "Leitura",
    listening: "Escuta",
    narrative: "Narrativa",
    speaking: "Conversação",
    dialog: "Diálogo",
  },
} as const;

export function LessonRow({ lesson }: { lesson: LessonDraftMeta }) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const [localPublished, setLocalPublished] = useState(lesson.published);
  const t = locale === "pt-BR"
    ? {
        publish: "Publicar",
        unpublish: "Despublicar",
        published: "Publicado",
        draft: "Rascunho",
        edit: "Editar",
        preview: "Ver",
        confirmDelete: "Apagar esta lição?",
        deleted: "Lição apagada",
        published_toast: "Lição publicada",
        unpublished_toast: "Lição despublicada",
        exercises: "ex.",
        min: "min",
      }
    : {
        publish: "Publish",
        unpublish: "Unpublish",
        published: "Published",
        draft: "Draft",
        edit: "Edit",
        preview: "Open",
        confirmDelete: "Delete this lesson?",
        deleted: "Lesson deleted",
        published_toast: "Lesson published",
        unpublished_toast: "Lesson unpublished",
        exercises: "ex.",
        min: "min",
      };

  const skillLabel =
    locale === "pt-BR"
      ? SKILL_LABELS.pt[lesson.category]
      : SKILL_LABELS.en[lesson.category];

  function togglePublish() {
    const next = !localPublished;
    startTransition(async () => {
      const result = await setDraftPublished({ slug: lesson.slug, published: next });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setLocalPublished(next);
        toast.success(next ? t.published_toast : t.unpublished_toast);
      }
    });
  }

  function onDelete() {
    if (!confirm(t.confirmDelete)) return;
    startTransition(async () => {
      const result = await deleteLessonDraft(lesson.slug);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.deleted);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-foreground/20">
      <span
        className={`inline-flex h-6 items-center rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider ${
          CEFR_PILL[lesson.cefr_level] ?? "bg-muted text-muted-foreground"
        }`}
      >
        {lesson.cefr_level.toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{lesson.title}</p>
          {localPublished ? (
            <Badge variant="default" className="gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              {t.published}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Circle className="h-3 w-3" />
              {t.draft}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">
          {skillLabel} · {lesson.exercise_count} {t.exercises} ·{" "}
          {lesson.estimated_minutes} {t.min} · {lesson.xp_reward} XP
          {lesson.character_ids.length > 0 ? (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {lesson.character_ids.length}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href={`/teacher/lessons/${lesson.slug}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <FileEdit className="h-3.5 w-3.5" />
          {t.preview}
        </Link>
        <Button
          size="sm"
          variant={localPublished ? "outline" : "default"}
          onClick={togglePublish}
          disabled={pending}
          className="h-8 text-xs"
        >
          {localPublished ? t.unpublish : t.publish}
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label="Delete"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
