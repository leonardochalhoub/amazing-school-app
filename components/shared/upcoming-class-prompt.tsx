"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, X, Users, GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type {
  UpcomingClassItem,
  UpcomingClassDebug,
} from "@/lib/actions/upcoming-class";

interface Props {
  items: UpcomingClassItem[];
  debug?: UpcomingClassDebug | null;
}

const DISMISS_KEY = "upcoming_class_prompt_dismissed_v4";

/**
 * Info-only corner toast listing the next scheduled classes (up to
 * five) for the signed-in user. No join/open buttons — just the
 * message + countdown + counterpart.
 */
export function UpcomingClassPrompt({ items, debug }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
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
        // eslint-disable-next-line no-console
        console.info(
          "[upcoming-class] popup hidden — you dismissed this exact list earlier in this tab. Clear sessionStorage or open a new tab to see it again.",
        );
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
          aria-label={pt ? "Fechar" : "Close"}
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
                {pt
                  ? items.length === 1
                    ? "Próxima aula"
                    : `Próximas ${items.length} aulas`
                  : items.length === 1
                    ? "Upcoming class"
                    : `Next ${items.length} classes`}
              </p>
            </div>
          </div>
        </div>

        {/* Items list */}
        <ul className="divide-y divide-border/50">
          {items.map((it) => {
            const when = new Date(it.scheduledAt);
            const countdown = describeCountdown(when.getTime(), now, pt);
            const dateLabel = when.toLocaleString(
              pt ? "pt-BR" : "en-US",
              {
                timeZone: "America/Sao_Paulo",
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              },
            );
            const isTeacher = it.role === "teacher";
            const counterpart = translateCounterpart(it.counterpart, pt);
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
                  <span className="truncate">{counterpart}</span>
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

/**
 * Calendar-day aware countdown. "Tomorrow 10:00" and "Tomorrow 23:00"
 * both read as "Amanhã" — using raw hour math was rounding both of
 * those to "1 dia" while a class two calendar days ahead at 10:00
 * also rounded to "1 dia".
 *
 * Everything resolves in BRT (America/Sao_Paulo, UTC-3) so a class
 * scheduled for 22:00 local doesn't jump forward a day because the
 * server ran in UTC.
 */
function describeCountdown(
  targetMs: number,
  nowMs: number,
  pt: boolean,
): string {
  const delta = targetMs - nowMs;
  if (delta <= 0) return pt ? "Em andamento" : "In progress";
  const min = Math.floor(delta / 60_000);
  if (min < 60) return pt ? `Em ${min} min` : `In ${min} min`;

  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const toBrtDay = (ms: number) => {
    const d = new Date(ms + BRT_OFFSET_MS);
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    );
  };
  const days = Math.round(
    (toBrtDay(targetMs) - toBrtDay(nowMs)) / 86_400_000,
  );
  if (days === 0) return pt ? "Hoje" : "Today";
  if (days === 1) return pt ? "Amanhã" : "Tomorrow";
  return pt ? `Em ${days} dias` : `In ${days} days`;
}

/** Only the empty-roster fallback strings ("0 alunos" / "Nenhum…")
 *  need translation — real names carry through unchanged. */
function translateCounterpart(raw: string, pt: boolean): string {
  if (pt) return raw;
  const m = raw.match(/^(\d+)\s+alunos?$/);
  if (m) {
    const n = Number(m[1]);
    return `${n} student${n === 1 ? "" : "s"}`;
  }
  return raw;
}
