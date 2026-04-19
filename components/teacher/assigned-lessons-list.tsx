"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Circle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { unassign, setAssignmentStatus } from "@/lib/actions/assignments";

export interface AssignedLessonMeta {
  assignmentId: string;
  lessonSlug: string;
  lessonTitle: string;
  cefrLevel?: string;
  category?: string;
  estimatedMinutes?: number | null;
  previewHref?: string | null;
  status: "assigned" | "skipped" | "completed";
  scope: "classroom-wide" | "per-student";
  assignedAt: string;
}

interface Props {
  assignments: AssignedLessonMeta[];
  canUnassign?: boolean;
}

const RECENT_DEFAULT = 10;

export function AssignedLessonsList({ assignments, canUnassign = true }: Props) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(assignments);
  const [showAll, setShowAll] = useState(false);

  const t = locale === "pt-BR"
    ? {
        empty: "Nenhuma lição atribuída ainda.",
        emptyHint: "Use o botão \"Atribuir lição\" acima para começar.",
        status: { assigned: "Atribuída", skipped: "Pulada", completed: "Concluída" },
        scope: { "classroom-wide": "Turma toda", "per-student": "Individual" },
        remove: "Remover",
        skip: "Pular",
        restore: "Restaurar",
        removed: "Atribuição removida",
        updated: "Atualizado",
        confirmRemove: "Remover esta lição da atribuição?",
        confirmRemoveClassroom:
          "Esta lição foi atribuída à TURMA TODA. Remover aqui apaga para todos os alunos da turma. Continuar?",
        showAll: (n: number) => `Ver todas as ${n} atribuições`,
        showRecent: (n: number) => `Mostrar apenas as ${n} mais recentes`,
        showingRecent: (n: number, total: number) =>
          `Mostrando as ${n} mais recentes de ${total}`,
      }
    : {
        empty: "No lessons assigned yet.",
        emptyHint: "Use the \"Assign lesson\" button above to get started.",
        status: { assigned: "Assigned", skipped: "Skipped", completed: "Completed" },
        scope: { "classroom-wide": "Whole class", "per-student": "Individual" },
        remove: "Remove",
        skip: "Skip",
        restore: "Restore",
        removed: "Assignment removed",
        updated: "Updated",
        confirmRemove: "Remove this lesson from assignments?",
        confirmRemoveClassroom:
          "This was assigned to the WHOLE CLASS. Removing here deletes it for every student in the classroom. Continue?",
        showAll: (n: number) => `Show all ${n} assignments`,
        showRecent: (n: number) => `Show only the ${n} most recent`,
        showingRecent: (n: number, total: number) =>
          `Showing the ${n} most recent of ${total}`,
      };

  // Newest first. Stable sort by assignedAt descending so order is
  // deterministic across renders.
  const sorted = [...local].sort(
    (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
  );
  const visible =
    showAll || sorted.length <= RECENT_DEFAULT
      ? sorted
      : sorted.slice(0, RECENT_DEFAULT);

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

  function onRemove(a: AssignedLessonMeta) {
    const message =
      a.scope === "classroom-wide" ? t.confirmRemoveClassroom : t.confirmRemove;
    if (!confirm(message)) return;
    startTransition(async () => {
      const r = await unassign({ assignmentId: a.assignmentId });
      if ("error" in r && r.error) {
        toast.error(r.error);
      } else {
        setLocal((prev) => prev.filter((x) => x.assignmentId !== a.assignmentId));
        toast.success(t.removed);
      }
    });
  }

  function onToggleSkip(a: AssignedLessonMeta) {
    const next = a.status === "skipped" ? "assigned" : "skipped";
    startTransition(async () => {
      const r = await setAssignmentStatus({
        assignmentId: a.assignmentId,
        status: next,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
      } else {
        setLocal((prev) =>
          prev.map((x) =>
            x.assignmentId === a.assignmentId ? { ...x, status: next } : x
          )
        );
        toast.success(t.updated);
      }
    });
  }

  if (local.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">{t.empty}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <ul className="space-y-2">
      {visible.map((a) => (
        <li
          key={a.assignmentId}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-foreground/20"
        >
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
              a.status === "completed"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : a.status === "skipped"
                  ? "bg-muted text-muted-foreground"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-300"
            }`}
          >
            {a.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : a.status === "skipped" ? (
              <CircleSlash className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {a.previewHref ? (
              <Link
                href={a.previewHref}
                className="group inline-flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
                title={locale === "pt-BR" ? "Ver como aluno" : "Preview as student"}
              >
                <span className="truncate">{a.lessonTitle}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold">{a.lessonTitle}</p>
            )}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
              {a.cefrLevel ? <span>{a.cefrLevel.toUpperCase()}</span> : null}
              {a.cefrLevel && a.category ? <span>·</span> : null}
              {a.category ? <span>{a.category}</span> : null}
              {(a.cefrLevel || a.category) && a.estimatedMinutes ? (
                <span>·</span>
              ) : null}
              {a.estimatedMinutes ? (
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  <Clock className="h-3 w-3" />
                  {a.estimatedMinutes}
                  {locale === "pt-BR" ? " min" : " min"}
                </span>
              ) : null}
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                {a.scope === "classroom-wide" ? (
                  <Users className="h-3 w-3" />
                ) : (
                  <UserRound className="h-3 w-3" />
                )}
                {t.scope[a.scope]}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarClock className="h-3 w-3" />
                {dateFormatter.format(new Date(a.assignedAt))}
              </span>
            </p>
          </div>

          <Badge
            variant={
              a.status === "completed"
                ? "default"
                : a.status === "skipped"
                  ? "outline"
                  : "secondary"
            }
            className="text-[10px]"
          >
            {t.status[a.status]}
          </Badge>

          {canUnassign ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleSkip(a)}
                disabled={pending}
                className="h-8 text-xs"
              >
                {a.status === "skipped" ? t.restore : t.skip}
              </Button>
              <button
                type="button"
                onClick={() => onRemove(a)}
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={t.remove}
                title={
                  a.scope === "classroom-wide"
                    ? t.confirmRemoveClassroom
                    : t.remove
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>

    {sorted.length > RECENT_DEFAULT ? (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {showAll
            ? `${sorted.length} ${locale === "pt-BR" ? "total" : "total"}`
            : t.showingRecent(RECENT_DEFAULT, sorted.length)}
        </span>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <Plus
            className={`h-3 w-3 transition-transform ${showAll ? "rotate-45" : ""}`}
          />
          {showAll
            ? t.showRecent(RECENT_DEFAULT)
            : t.showAll(sorted.length)}
        </button>
      </div>
    ) : null}
    </div>
  );
}
