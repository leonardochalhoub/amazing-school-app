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
  /** "month" for 5-year monthly buckets, "day" for 30-day daily buckets. */
  granularity?: "month" | "day";
}

export function ActivityChart({ buckets, granularity = "month" }: Props) {
  const [hover, setHover] = useState<ActivityBucket | null>(null);

  const { max, totalLessons, totalMusic } = useMemo(() => {
    let m = 0;
    let l = 0;
    let mu = 0;
    for (const b of buckets) {
      const t = b.lessons + b.music;
      if (t > m) m = t;
      l += b.lessons;
      mu += b.music;
    }
    return { max: m, totalLessons: l, totalMusic: mu };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No activity yet — your completed lessons and music exercises will
        appear here over time.
      </div>
    );
  }

  const H = 120;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium text-foreground">
          {granularity === "month"
            ? `Activity · last ${buckets.length} months`
            : `Activity · last ${buckets.length} days`}{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            ({granularity === "month" ? "per month" : "per day"})
          </span>
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <LegendSwatch className="bg-indigo-500" label={`Lessons · ${totalLessons}`} />
          <LegendSwatch className="bg-pink-500" label={`Music · ${totalMusic}`} />
        </div>
      </div>

      <div
        className="relative grid items-end"
        style={{
          // Tight-pack bars with no gap when the chart is dense
          // (daily buckets over a long range) so each bar is at least
          // a pixel wide instead of dissolving into gap. Sparse
          // monthly charts still breathe thanks to the rounded-sm.
          gap: buckets.length > 120 ? 0 : 2,
          gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
          height: H,
        }}
      >
        {buckets.map((b, i) => {
          const total = b.lessons + b.music;
          const totalPct = max > 0 ? (total / max) * 100 : 0;
          const lessonPct = total > 0 ? (b.lessons / total) * 100 : 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(b)}
              onBlur={() => setHover(null)}
              tabIndex={total > 0 ? 0 : -1}
              title={`${formatBucket(b.start, granularity)} · ${b.lessons} lessons · ${b.music} music`}
              className="group relative flex h-full flex-col justify-end"
            >
              <div
                className="w-full overflow-hidden rounded-sm transition-opacity group-hover:opacity-100"
                style={{
                  height: `${totalPct}%`,
                  // Bump empty-bar visibility + the minimum height of
                  // a single completion so a sparse student's activity
                  // still reads at a glance on a 2-year daily chart
                  // (one event in 730 buckets otherwise renders as
                  // essentially zero pixels).
                  minHeight: total > 0 ? 8 : 0,
                  opacity: total === 0 ? 0.15 : 0.95,
                }}
              >
                <div
                  className="w-full bg-indigo-500"
                  style={{ height: `${lessonPct}%` }}
                />
                <div
                  className="w-full bg-pink-500"
                  style={{ height: `${100 - lessonPct}%` }}
                />
              </div>
            </div>
          );
        })}

        {hover ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 text-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-[10px] shadow-sm">
              <strong>{formatBucket(hover.start, granularity)}</strong>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" />
                {hover.lessons} lesson{hover.lessons === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-pink-500" />
                {hover.music} music
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{formatBucket(buckets[0].start, granularity)}</span>
        <span>{formatBucket(buckets[buckets.length - 1].start, granularity)}</span>
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function formatBucket(start: string, granularity: "month" | "day"): string {
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
    timeZone: "UTC",
  });
}
