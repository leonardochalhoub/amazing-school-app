"use client";

import { useMemo, useState } from "react";
import { Music2, BookOpen } from "lucide-react";
import type { LessonMeta } from "@/lib/content/loader";
import { CEFR_BANDS, SKILLS, cefrBandOf } from "@/lib/content/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface PickerMusic {
  slug: string;
  title: string;
  artist: string;
  cefr_level: string;
  duration_seconds: number;
}

interface LessonPickerProps {
  lessons: LessonMeta[];
  /** Optional — when provided, music tracks appear in the same
   *  list. onPick receives `music:<slug>` so the caller can route
   *  the assignment through the music code-path. */
  music?: PickerMusic[];
  onPick: (slug: string) => void | Promise<void>;
  pickLabel?: string;
  excludeSlugs?: string[];
  pending?: boolean;
}

type Row =
  | {
      kind: "lesson";
      slug: string;
      title: string;
      cefr_level: string;
      category: string;
      exercise_count: number;
      estimated_minutes: number;
      xp_reward: number;
    }
  | {
      kind: "music";
      slug: string;
      title: string;
      cefr_level: string;
      artist: string;
      estimated_minutes: number;
      xp_reward: number;
    };

export function LessonPicker({
  lessons,
  music = [],
  onPick,
  pickLabel = "Assign",
  excludeSlugs = [],
  pending = false,
}: LessonPickerProps) {
  const [cefr, setCefr] = useState<string | "all">("all");
  const [skill, setSkill] = useState<string | "all">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "lesson" | "music">(
    "all",
  );
  const [q, setQ] = useState("");

  const exclude = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const l of lessons) {
      out.push({
        kind: "lesson",
        slug: l.slug,
        title: l.title,
        cefr_level: l.cefr_level,
        category: l.category,
        exercise_count: l.exercise_count,
        estimated_minutes: l.estimated_minutes,
        xp_reward: l.xp_reward,
      });
    }
    for (const m of music) {
      out.push({
        kind: "music",
        slug: `music:${m.slug}`,
        title: `${m.artist} — ${m.title}`,
        cefr_level: m.cefr_level,
        artist: m.artist,
        estimated_minutes: Math.max(5, Math.round((m.duration_seconds / 60) * 2)),
        xp_reward: 30,
      });
    }
    return out;
  }, [lessons, music]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => !exclude.has(r.slug))
      .filter((r) => kindFilter === "all" || r.kind === kindFilter)
      .filter(
        (r) => cefr === "all" || cefrBandOf(r.cefr_level) === cefr,
      )
      .filter((r) => {
        if (skill === "all") return true;
        if (r.kind === "music") return false;
        return r.category === skill;
      })
      .filter((r) =>
        q.trim() === ""
          ? true
          : r.title.toLowerCase().includes(q.toLowerCase()) ||
            r.slug.toLowerCase().includes(q.toLowerCase()),
      );
  }, [rows, cefr, skill, kindFilter, q, exclude]);

  const lessonCount = filtered.filter((r) => r.kind === "lesson").length;
  const musicCount = filtered.filter((r) => r.kind === "music").length;

  return (
    <div className="space-y-3">
      {/* Filter row: three equal-sized selects + summary count on
          the right. Keeps the top of the dialog tidy and the count
          chip legible on any viewport. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2 min-w-[260px]">
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as "all" | "lesson" | "music")
            }
          >
            <option value="all">Lessons + songs</option>
            <option value="lesson">Only lessons</option>
            <option value="music">Only songs</option>
          </select>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            value={cefr}
            onChange={(e) => setCefr(e.target.value)}
          >
            <option value="all">All CEFR</option>
            {CEFR_BANDS.map((b) => (
              <option key={b} value={b}>
                {b.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            title="Skill filter only applies to lessons"
          >
            <option value="all">All skills</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {filtered.length} items
          {music.length > 0
            ? ` · ${lessonCount} lessons · ${musicCount} songs`
            : ""}
        </span>
      </div>

      {/* Search on its own row, full width. Separating search from
          the filters stops the row from wrapping awkwardly when
          the count chip grows. */}
      <Input
        className="h-9 text-xs"
        placeholder="Search title or artist…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Nothing matches the filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li
                key={r.slug}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    r.kind === "music"
                      ? "bg-pink-500/15 text-pink-600 dark:text-pink-300"
                      : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                  }`}
                >
                  {r.kind === "music" ? (
                    <Music2 className="h-4 w-4" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">
                    {r.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground/70">
                      {r.cefr_level.toUpperCase()}
                    </span>
                    {r.kind === "lesson"
                      ? ` · ${r.category} · ${r.exercise_count} ex · ${r.estimated_minutes} min`
                      : ` · song · ${r.estimated_minutes} min`}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[10px] tabular-nums"
                >
                  {r.xp_reward} XP
                </Badge>
                <Button
                  size="sm"
                  onClick={() => onPick(r.slug)}
                  disabled={pending}
                  className="shrink-0"
                >
                  {pickLabel}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
