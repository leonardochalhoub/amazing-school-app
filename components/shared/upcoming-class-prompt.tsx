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
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UpcomingClassContext } from "@/lib/actions/upcoming-class";

interface Props {
  /** Null when there's nothing to show. */
  ctx: UpcomingClassContext | null;
}

const DISMISS_STORAGE_PREFIX = "upcoming_class_dismissed_";

/**
 * Plain overlay popup for the next scheduled class. Dropped the
 * base-ui Dialog entirely — previous iterations wouldn't render
 * reliably across hydration. Now a fixed backdrop + centered card,
 * dismissed via the X button, backdrop click, "Depois", or Escape.
 *
 * Dismissal per class-id is remembered in sessionStorage so switching
 * routes doesn't re-pop the same dialog within one browser session.
 */
export function UpcomingClassPrompt({ ctx }: Props) {
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    if (!ctx) return;
    try {
      if (
        window.sessionStorage.getItem(
          `${DISMISS_STORAGE_PREFIX}${ctx.id}`,
        ) === "1"
      ) {
        setClosed(true);
      }
    } catch {
      // sessionStorage may throw in private mode; no-op.
    }
  }, [ctx]);

  const visible = mounted && ctx !== null && !closed && now !== null;

  useEffect(() => {
    if (!visible) return;
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const countdown = useMemo(() => {
    if (!ctx || now === null) return "";
    return describeCountdown(new Date(ctx.scheduledAt).getTime(), now);
  }, [ctx, now]);

  function dismiss() {
    try {
      if (ctx) {
        window.sessionStorage.setItem(
          `${DISMISS_STORAGE_PREFIX}${ctx.id}`,
          "1",
        );
      }
    } catch {
      /* no-op */
    }
    setClosed(true);
  }

  if (!visible || !ctx) return null;

  const when = new Date(ctx.scheduledAt);
  const dateLabel = when.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isTeacher = ctx.role === "teacher";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-class-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={dismiss}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Hero band */}
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
              <h2
                id="upcoming-class-title"
                className="truncate text-lg font-semibold leading-tight"
              >
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

        <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20 px-6 py-3 sm:justify-between">
          <Button type="button" variant="outline" onClick={dismiss}>
            Depois · Later
          </Button>
          <div className="flex flex-wrap gap-2">
            {isTeacher ? (
              <Link
                href={`/teacher/classroom/${ctx.classroomId}`}
                onClick={() => setClosed(true)}
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
              onClick={() => setClosed(true)}
              className={cn(
                buttonVariants({ variant: "default" }),
                "gap-1.5 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
              )}
            >
              <Video className="h-4 w-4" />
              Entrar na aula · Join
            </a>
          </div>
        </div>
      </div>
    </div>
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
