"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export interface ActivityBucket {
  /** First day of the bucket, YYYY-MM-DD. */
  start: string;
  /** Lessons completed in this bucket. */
  lessons: number;
  /** Music exercises completed in this bucket. */
  music: number;
  /** Live classes held in this bucket (Done with duration_minutes set). */
  live: number;
}

interface Props {
  buckets: ActivityBucket[];
  /** "month" | "week" | "day" — affects header copy + tooltip format. */
  granularity?: "month" | "week" | "day";
}

export function ActivityChart({ buckets, granularity = "month" }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [hover, setHover] = useState<{ b: ActivityBucket; i: number } | null>(
    null,
  );

  const { max, totalLessons, totalMusic, totalLive, activeDays } = useMemo(() => {
    let m = 0;
    let l = 0;
    let mu = 0;
    let lv = 0;
    let a = 0;
    for (const b of buckets) {
      const t = b.lessons + b.music + (b.live ?? 0);
      if (t > m) m = t;
      if (t > 0) a++;
      l += b.lessons;
      mu += b.music;
      lv += b.live ?? 0;
    }
    return {
      max: m,
      totalLessons: l,
      totalMusic: mu,
      totalLive: lv,
      activeDays: a,
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {pt
          ? "Ainda sem atividade — suas lições e músicas concluídas aparecerão aqui com o tempo."
          : "No activity yet — your completed lessons and music exercises will appear here over time."}
      </div>
    );
  }

  // Y axis scales to THIS student's personal record. The busiest
  // day sets the top of the chart — if their all-time best is 3
  // completions, a 3-event day fills the chart; the first day they
  // pull off a 5, the chart re-renders with yMax=5 and that day
  // hits the ceiling. All rungs are integers (1, 2, 3, …) so the
  // reader can literally count completions against the gridlines.
  const yMax = Math.max(1, max);
  const H = 140;
  const unitPx = (H - 12) / yMax;

  // Month tick positions — index of the first bucket that starts a
  // new month, so we can drop a label under the chart. Works for any
  // granularity where bucket.start parses as a date.
  const monthTicks = useMemo(() => {
    const ticks: { i: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < buckets.length; i++) {
      const d = new Date(buckets[i].start + "T00:00:00Z");
      const m = d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        ticks.push({
          i,
          label: d.toLocaleDateString(pt ? "pt-BR" : "en-US", {
            month: "short",
            year:
              d.getUTCMonth() === 0 && i > 0 ? "2-digit" : undefined,
            timeZone: "UTC",
          }),
        });
      }
    }
    // Keep the density readable on long ranges — cap to ~24 labels.
    const step = Math.max(1, Math.ceil(ticks.length / 24));
    return ticks.filter((_, idx) => idx % step === 0);
  }, [buckets, pt]);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium text-foreground">
          {pt
            ? granularity === "month"
              ? `Atividade · últimos ${buckets.length} meses`
              : granularity === "week"
                ? `Atividade · últimas ${buckets.length} semanas`
                : `Atividade · últimos ${buckets.length} dias`
            : granularity === "month"
              ? `Activity · last ${buckets.length} months`
              : granularity === "week"
                ? `Activity · last ${buckets.length} weeks`
                : `Activity · last ${buckets.length} days`}{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            (
            {pt
              ? granularity === "month"
                ? "por mês"
                : granularity === "week"
                  ? "por semana"
                  : "por dia"
              : granularity === "month"
                ? "per month"
                : granularity === "week"
                  ? "per week"
                  : "per day"}{" "}
            · {activeDays}{" "}
            {pt
              ? granularity === "month"
                ? "meses ativos"
                : granularity === "week"
                  ? "semanas ativas"
                  : "dias ativos"
              : `active ${
                  granularity === "month"
                    ? "months"
                    : granularity === "week"
                      ? "weeks"
                      : "days"
                }`}
            )
          </span>
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <LegendSwatch
            className="bg-indigo-500"
            label={`${pt ? "Lições" : "Lessons"} · ${totalLessons}`}
          />
          <LegendSwatch
            className="bg-pink-500"
            label={`${pt ? "Músicas" : "Songs"} · ${totalMusic}`}
          />
          <LegendSwatch
            className="bg-emerald-500"
            label={`${pt ? "Aulas ao vivo" : "Live Classes"} · ${totalLive}`}
          />
          <span className="tabular-nums">
            {pt ? "Pico" : "Peak"} · {max}/
            {pt
              ? granularity === "month"
                ? "mês"
                : granularity === "week"
                  ? "sem"
                  : "dia"
              : granularity === "month"
                ? "mo"
                : granularity === "week"
                  ? "wk"
                  : "day"}
          </span>
        </div>
      </div>

      <div className="relative pl-7" style={{ height: H }}>
        {/* Horizontal gridlines — one rung per integer up to yMax so
            the reader can count completions against the axis.
            Gridline positions use the same unit as bar heights so
            the n=yMax line sits at the top of a max-day bar. */}
        {Array.from({ length: yMax + 1 }, (_, n) => n).map((n) => (
          <div
            key={n}
            aria-hidden
            className="absolute right-0 left-7 border-t border-border/40"
            style={{ bottom: `${n * unitPx}px` }}
          />
        ))}
        {/* Y-axis integer labels — rendered in the left 28px gutter.
            Positioned by transform so the baseline sits on the
            matching gridline, not 6px above it. */}
        {Array.from({ length: yMax + 1 }, (_, n) => n).map((n) => (
          <span
            key={`label-${n}`}
            aria-hidden
            className="absolute left-0 w-6 text-right text-[10px] font-medium tabular-nums text-muted-foreground"
            style={{
              bottom: `${n * unitPx}px`,
              transform: "translateY(50%)",
              lineHeight: 1,
            }}
          >
            {n}
          </span>
        ))}

        <div
          className="relative grid h-full items-end"
          style={{
            gap: buckets.length > 200 ? 0 : buckets.length > 80 ? 1 : 2,
            gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
          }}
        >
          {buckets.map((b, i) => {
            const live = b.live ?? 0;
            const total = b.lessons + b.music + live;
            if (total === 0) {
              return <div key={i} aria-hidden className="h-full" />;
            }
            // Stacked bar order from the bottom up:
            // lessons (indigo) → music (pink) → live (emerald).
            const lessonPx = b.lessons * unitPx;
            const musicPx = b.music * unitPx;
            const livePx = live * unitPx;
            const isHover = hover?.i === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHover({ b, i })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ b, i })}
                onBlur={() => setHover(null)}
                tabIndex={0}
                title={`${formatBucket(b.start, granularity, pt)} · ${b.lessons} ${pt ? "lições" : "lessons"} · ${b.music} ${pt ? "músicas" : "music"} · ${live} ${pt ? "ao vivo" : "live"}`}
                className="group relative flex h-full flex-col justify-end"
              >
                <div
                  className={`flex w-full flex-col-reverse overflow-hidden rounded-sm transition-opacity ${
                    isHover ? "opacity-100" : "opacity-90"
                  }`}
                >
                  {lessonPx > 0 ? (
                    <div
                      className="w-full bg-indigo-500"
                      style={{ height: `${lessonPx}px` }}
                    />
                  ) : null}
                  {musicPx > 0 ? (
                    <div
                      className="w-full bg-pink-500"
                      style={{ height: `${musicPx}px` }}
                    />
                  ) : null}
                  {livePx > 0 ? (
                    <div
                      className="w-full bg-emerald-500"
                      style={{ height: `${livePx}px` }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover tooltip pinned to top of chart area. */}
        {hover ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-[10px] shadow-sm">
              <strong>{formatBucket(hover.b.start, granularity, pt)}</strong>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" />
                {hover.b.lessons}{" "}
                {pt
                  ? hover.b.lessons === 1
                    ? "lição"
                    : "lições"
                  : hover.b.lessons === 1
                    ? "lesson"
                    : "lessons"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-pink-500" />
                {hover.b.music} {pt ? "músicas" : "music"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                {hover.b.live ?? 0} {pt ? "ao vivo" : "live"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Month tick strip — positions labels along the x-axis so the
          user can read "this busy patch was in May 2025" at a glance
          instead of only seeing the two edge dates. */}
      <div className="flex h-4 text-[9px] text-muted-foreground tabular-nums">
        <div aria-hidden className="w-7 shrink-0" />
        <div className="relative h-4 flex-1" aria-hidden>
          {monthTicks.map(({ i, label }) => (
            <span
              key={`${i}-${label}`}
              className="absolute whitespace-nowrap"
              style={{
                left: `${(i / Math.max(1, buckets.length - 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function formatBucket(
  start: string,
  granularity: "month" | "week" | "day",
  pt: boolean,
): string {
  const d = new Date(start + "T00:00:00Z");
  const loc = pt ? "pt-BR" : "en-US";
  if (granularity === "month") {
    return d.toLocaleDateString(loc, {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
}
