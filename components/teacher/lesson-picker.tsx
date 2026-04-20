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
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded border border-border bg-background px-2 text-xs"
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
          className="h-8 rounded border border-border bg-background px-2 text-xs"
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
          className="h-8 rounded border border-border bg-background px-2 text-xs"
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
        <Input
          className="h-8 w-full max-w-xs text-xs"
          placeholder="Search title or artist…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} items
          {music.length > 0
            ? ` · ${lessonCount} lessons · ${musicCount} songs`
            : ""}
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded border border-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            Nothing matches the filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li
                key={r.slug}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      r.kind === "music"
                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {r.kind === "music" ? (
                      <Music2 className="h-3.5 w-3.5" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {r.cefr_level.toUpperCase()}
                      {r.kind === "lesson"
                        ? ` · ${r.category} · ${r.exercise_count} ex · ${r.estimated_minutes} min`
                        : ` · song · ${r.estimated_minutes} min`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {r.xp_reward} XP
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => onPick(r.slug)}
                    disabled={pending}
                  >
                    {pickLabel}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
