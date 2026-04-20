"use client";

import { useMemo, useState } from "react";

export interface ActivityBucket {
  /** First day of the bucket, YYYY-MM-DD. */
  start: string;
  /** Lessons completed in this bucket. */
  lessons: number;
  /** Music exercises completed in this bucket. */
  music: number;
}

interface Props {
  buckets: ActivityBucket[];
  /** "month" | "week" | "day" — affects header copy + tooltip format. */
  granularity?: "month" | "week" | "day";
}

export function ActivityChart({ buckets, granularity = "month" }: Props) {
  const [hover, setHover] = useState<{ b: ActivityBucket; i: number } | null>(
    null,
  );

  const { max, totalLessons, totalMusic, activeDays } = useMemo(() => {
    let m = 0;
    let l = 0;
    let mu = 0;
    let a = 0;
    for (const b of buckets) {
      const t = b.lessons + b.music;
      if (t > m) m = t;
      if (t > 0) a++;
      l += b.lessons;
      mu += b.music;
    }
    return { max: m, totalLessons: l, totalMusic: mu, activeDays: a };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No activity yet — your completed lessons and music exercises will
        appear here over time.
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
          label: d.toLocaleDateString("en-US", {
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
  }, [buckets]);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium text-foreground">
          {granularity === "month"
            ? `Activity · last ${buckets.length} months`
            : granularity === "week"
              ? `Activity · last ${buckets.length} weeks`
              : `Activity · last ${buckets.length} days`}{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            (
            {granularity === "month"
              ? "per month"
              : granularity === "week"
                ? "per week"
                : "per day"}{" "}
            · {activeDays} active)
          </span>
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <LegendSwatch
            className="bg-indigo-500"
            label={`Lessons · ${totalLessons}`}
          />
          <LegendSwatch
            className="bg-pink-500"
            label={`Music · ${totalMusic}`}
          />
          <span className="tabular-nums">Peak · {max}/day</span>
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
            const total = b.lessons + b.music;
            if (total === 0) {
              return <div key={i} aria-hidden className="h-full" />;
            }
            // Stacked bar: lessons anchor the ground floor, music
            // stacks on top. Each unit is unitPx (~27px at yMax=4)
            // so a 1-event day is a stub and a 4-event day tops out.
            const lessonPx = b.lessons * unitPx;
            const musicPx = b.music * unitPx;
            const isHover = hover?.i === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHover({ b, i })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ b, i })}
                onBlur={() => setHover(null)}
                tabIndex={0}
                title={`${formatBucket(b.start, granularity)} · ${b.lessons} lessons · ${b.music} music`}
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
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover tooltip pinned to top of chart area. */}
        {hover ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-[10px] shadow-sm">
              <strong>{formatBucket(hover.b.start, granularity)}</strong>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" />
                {hover.b.lessons} lesson{hover.b.lessons === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-pink-500" />
                {hover.b.music} music
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
): string {
  const d = new Date(start + "T00:00:00Z");
  if (granularity === "month") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
}
