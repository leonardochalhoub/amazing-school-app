"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Video,
  X,
  Users,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { UpcomingClassContext } from "@/lib/actions/upcoming-class";

interface Props {
  /** Null when there's nothing to show. */
  ctx: UpcomingClassContext | null;
}

const DISMISS_STORAGE_PREFIX = "upcoming_class_dismissed_";

/**
 * Floating corner toast for the next scheduled class. Small card
 * anchored to the bottom-right of the viewport — no backdrop, no
 * modal, just a notification the user can glance at and dismiss.
 * Dismissal per class-id sticks in sessionStorage so it doesn't
 * re-pop across route changes in the same session.
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
      /* no-op */
    }
  }, [ctx]);

  const visible = mounted && ctx !== null && !closed && now !== null;

  useEffect(() => {
    if (!visible) return;
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
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
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isTeacher = ctx.role === "teacher";
  const counterpart = isTeacher
    ? `${ctx.counterpart.totalStudents ?? 0} aluno${(ctx.counterpart.totalStudents ?? 0) === 1 ? "" : "s"}`
    : ctx.counterpart.teacherName ?? "Seu professor";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-[calc(100%-2rem)] sm:max-w-sm">
      <div className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl ring-1 ring-border">
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Hero band with countdown + title */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-4 py-3 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_55%)]" />
          <div className="relative flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                Próxima aula
              </p>
              <p className="truncate text-sm font-semibold leading-tight">
                {ctx.title}
              </p>
            </div>
          </div>
          <p className="relative mt-1.5 text-[11px] text-white/90">
            <span className="mr-1 font-semibold">{countdown}</span>
            <span>· {dateLabel}</span>
          </p>
        </div>

        {/* Body */}
        <div className="space-y-1.5 px-4 py-3 text-xs">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {ctx.classroomName}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            {isTeacher ? (
              <Users className="h-3 w-3" />
            ) : (
              <GraduationCap className="h-3 w-3" />
            )}
            <span className="truncate">{counterpart}</span>
          </p>
        </div>

        {/* Footer action */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2">
          <a
            href={ctx.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setClosed(true)}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "w-full justify-center gap-1.5 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
            )}
          >
            <Video className="h-3.5 w-3.5" />
            Entrar na aula
          </a>
          {isTeacher ? (
            <Link
              href={`/teacher/classroom/${ctx.classroomId}`}
              onClick={() => setClosed(true)}
              className="mt-1.5 block text-center text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Abrir turma →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
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
