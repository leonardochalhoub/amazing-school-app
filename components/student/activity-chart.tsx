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
  /** "month" for monthly buckets, "day" for daily. */
  granularity?: "month" | "day";
}

export function ActivityChart({ buckets, granularity = "month" }: Props) {
  const [hover, setHover] = useState<ActivityBucket | null>(null);

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

  // Chart height — a hair taller than before so daily bar heights
  // actually read. The stacked bar uses absolute pixels for each
  // segment (not %) so small counts stay distinguishable from big
  // ones even when max is 2 or 3.
  const H = 140;
  const unitPx = Math.max(4, Math.floor((H - 8) / Math.max(1, max)));

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium text-foreground">
          {granularity === "month"
            ? `Activity · last ${buckets.length} months`
            : `Activity · last ${buckets.length} days`}{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            ({granularity === "month" ? "per month" : "per day"} ·{" "}
            {activeDays} active)
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
        </div>
      </div>

      <div
        className="relative grid items-end"
        style={{
          gap: buckets.length > 200 ? 0 : buckets.length > 80 ? 1 : 2,
          gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
          height: H,
        }}
      >
        {buckets.map((b, i) => {
          const total = b.lessons + b.music;
          if (total === 0) {
            // Empty day: no bar, no background — the daily cadence
            // reads as presence/absence against the card background.
            return <div key={i} aria-hidden className="h-full" />;
          }
          // Stacked bar: lessons at the bottom (the "ground floor")
          // and music stacked on top. Each unit of completion is a
          // fixed pixel height (unitPx) so a 4-lesson day is
          // visibly taller than a 1-lesson day instead of both
          // saturating to the container.
          const lessonPx = b.lessons * unitPx;
          const musicPx = b.music * unitPx;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(b)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              title={`${formatBucket(b.start, granularity)} · ${b.lessons} lessons · ${b.music} music`}
              className="group relative flex h-full flex-col justify-end"
            >
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm">
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
        <span>
          {formatBucket(buckets[buckets.length - 1].start, granularity)}
        </span>
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
