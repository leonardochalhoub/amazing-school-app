"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, X, Users, GraduationCap } from "lucide-react";
import type {
  UpcomingClassItem,
  UpcomingClassDebug,
} from "@/lib/actions/upcoming-class";

interface Props {
  items: UpcomingClassItem[];
  debug?: UpcomingClassDebug | null;
}

const DISMISS_KEY = "upcoming_class_prompt_dismissed_v3";

/**
 * Info-only corner toast listing the next scheduled classes (up to
 * five) for the signed-in user. No join/open buttons — just the
 * message + countdown + counterpart.
 */
export function UpcomingClassPrompt({ items, debug }: Props) {
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // Build a stable signature of the items so we can key the
  // sessionStorage dismissal to "this batch" — when the class list
  // changes (new class scheduled, one starts), the popup re-pops.
  const signature = useMemo(
    () => items.map((i) => `${i.id}:${i.scheduledAt}`).join("|"),
    [items],
  );

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    if (items.length === 0) {
      // eslint-disable-next-line no-console
      console.info("[upcoming-class] no items · server debug:", debug);
      return;
    }
    // eslint-disable-next-line no-console
    console.info(
      "[upcoming-class] items received:",
      items.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt,
        label: i.label,
      })),
    );
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === signature) {
        setClosed(true);
      }
    } catch {
      /* no-op */
    }
  }, [items, signature, debug]);

  useEffect(() => {
    if (closed || !mounted || items.length === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, [closed, mounted, items.length]);

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* no-op */
    }
    setClosed(true);
  }

  if (!mounted || closed || now === null || items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[100] flex max-w-[calc(100%-2rem)] sm:max-w-sm">
      <div className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl ring-1 ring-border">
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Hero band */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-4 py-3 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_55%)]" />
          <div className="relative flex items-center gap-2.5 pr-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {items.length === 1
                  ? "Próxima aula"
                  : `Próximas ${items.length} aulas`}
              </p>
            </div>
          </div>
        </div>

        {/* Items list */}
        <ul className="divide-y divide-border/50">
          {items.map((it) => {
            const when = new Date(it.scheduledAt);
            const countdown = describeCountdown(when.getTime(), now);
            const dateLabel = when.toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const isTeacher = it.role === "teacher";
            return (
              <li key={it.id} className="space-y-1 px-4 py-3 text-xs">
                <p className="text-sm font-semibold leading-tight">
                  {it.title}
                </p>
                <p className="tabular-nums">
                  <span className="font-semibold text-foreground">
                    {countdown}
                  </span>
                  <span className="text-muted-foreground"> · {dateLabel}</span>
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="font-medium">{it.label}</span>
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  {isTeacher ? (
                    <Users className="h-3 w-3" />
                  ) : (
                    <GraduationCap className="h-3 w-3" />
                  )}
                  <span className="truncate">{it.counterpart}</span>
                </p>
                {it.content ? (
                  <p className="mt-1 whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                    {it.content}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
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
