"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Video,
  Users,
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UpcomingClassContext } from "@/lib/actions/upcoming-class";

interface Props {
  /** Null when there's nothing to show. */
  ctx: UpcomingClassContext | null;
}

const DISMISS_STORAGE_PREFIX = "upcoming_class_dismissed_";

/**
 * Context-rich dialog advertising the next scheduled class. Two
 * variants — teacher sees their roster + previous-class notes +
 * assigned-but-not-done lessons, student sees their teacher +
 * what to prep. Dismissal is remembered in sessionStorage keyed
 * by class id, so switching routes doesn't re-pop the same dialog
 * within one browser session (the next class, once it's past,
 * clears itself automatically).
 */
export function UpcomingClassPrompt({ ctx }: Props) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ctx) return;
    const dismissed =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(
        `${DISMISS_STORAGE_PREFIX}${ctx.id}`,
      ) === "1";
    if (!dismissed) setOpen(true);
  }, [ctx]);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [open]);

  const countdown = useMemo(() => {
    if (!ctx) return "";
    return describeCountdown(new Date(ctx.scheduledAt).getTime(), now);
  }, [ctx, now]);

  if (!ctx) return null;

  const when = new Date(ctx.scheduledAt);
  const dateLabel = when.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isTeacher = ctx.role === "teacher";

  function dismiss() {
    try {
      window.sessionStorage.setItem(
        `${DISMISS_STORAGE_PREFIX}${ctx!.id}`,
        "1",
      );
    } catch {
      // sessionStorage may throw in private mode — falling back to
      // just closing this instance is fine.
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        {/* Hero band — purple gradient with the countdown pill */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-5 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <CalendarClock className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                {isTeacher
                  ? "Próxima aula · Upcoming class"
                  : "Sua próxima aula · Your upcoming class"}
              </p>
              <h2 className="truncate text-lg font-semibold leading-tight">
                {ctx.title}
              </h2>
              <p className="mt-0.5 truncate text-xs text-white/90">
                {ctx.classroomName}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              {countdown}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <DialogHeader className="sr-only">
            <DialogTitle>{ctx.title}</DialogTitle>
            <DialogDescription>
              {isTeacher ? "Próxima aula" : "Sua próxima aula"} ·
              {ctx.classroomName}
            </DialogDescription>
          </DialogHeader>

          {/* When + counterpart */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Quando · When
              </p>
              <p className="mt-1 text-sm font-semibold capitalize">
                {dateLabel}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isTeacher ? (
                  <>
                    <Users className="h-3 w-3" /> Alunos · Students
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-3 w-3" /> Professor · Teacher
                  </>
                )}
              </p>
              {isTeacher ? (
                <TeacherCounterpart ctx={ctx} />
              ) : (
                <p className="mt-1 truncate text-sm font-semibold">
                  {ctx.counterpart.teacherName || "Seu professor"}
                </p>
              )}
            </div>
          </div>

          {/* Prep lessons */}
          {ctx.prepLessons.length > 0 ? (
            <div className="rounded-xl border border-border/70 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                {isTeacher
                  ? "A turma ainda não terminou"
                  : "Para revisar antes da aula · To prep"}
              </p>
              <ul className="mt-2 space-y-1.5">
                {ctx.prepLessons.slice(0, 4).map((l) => (
                  <li
                    key={l.slug}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
                    <span className="truncate">{l.title}</span>
                  </li>
                ))}
              </ul>
              {ctx.prepLessons.length > 4 ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  +{ctx.prepLessons.length - 4} mais
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Previous note */}
          {ctx.previousNote ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Anotações da aula anterior
              </p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed">
                {ctx.previousNote}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-3 sm:justify-between">
          <Button type="button" variant="outline" onClick={dismiss}>
            Depois · Later
          </Button>
          <div className="flex gap-2">
            {isTeacher ? (
              <Link
                href={`/teacher/classroom/${ctx.classroomId}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "gap-1.5",
                )}
              >
                Abrir turma
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <a
              href={ctx.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default" }),
                "gap-1.5 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
              )}
            >
              <Video className="h-4 w-4" />
              Entrar na aula · Join
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeacherCounterpart({ ctx }: { ctx: UpcomingClassContext }) {
  const students = ctx.counterpart.students ?? [];
  const total = ctx.counterpart.totalStudents ?? students.length;
  if (total === 0) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        Nenhum aluno na turma ainda
      </p>
    );
  }
  const shown = students.slice(0, 3).map((s) => s.name);
  const more = total - shown.length;
  return (
    <p className="mt-1 text-sm font-semibold">
      <span className="truncate">{shown.join(" · ")}</span>
      {more > 0 ? (
        <span className="ml-1 text-muted-foreground">+{more}</span>
      ) : null}
    </p>
  );
}

/**
 * Human-friendly countdown used for the pill in the hero band.
 * Negative values (class already started) are reported as
 * "em andamento" until the 60-minute grace window closes upstream.
 */
function describeCountdown(targetMs: number, nowMs: number): string {
  const delta = targetMs - nowMs;
  if (delta <= 0) return "Em andamento";
  const min = Math.round(delta / 60_000);
  if (min < 60) return `Em ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Em ${h} h`;
  const d = Math.round(h / 24);
  return `Em ${d} dia${d === 1 ? "" : "s"}`;
}
