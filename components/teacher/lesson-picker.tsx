"use client";

import { useMemo, useState } from "react";
import type { LessonMeta } from "@/lib/content/loader";
import { CEFR_LEVELS, SKILLS } from "@/lib/content/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface LessonPickerProps {
  lessons: LessonMeta[];
  onPick: (slug: string) => void | Promise<void>;
  pickLabel?: string;
  excludeSlugs?: string[];
  pending?: boolean;
}

export function LessonPicker({
  lessons,
  onPick,
  pickLabel = "Assign",
  excludeSlugs = [],
  pending = false,
}: LessonPickerProps) {
  const [cefr, setCefr] = useState<string | "all">("all");
  const [skill, setSkill] = useState<string | "all">("all");
  const [q, setQ] = useState("");

  const exclude = useMemo(() => new Set(excludeSlugs), [excludeSlugs]);

  const filtered = useMemo(() => {
    return lessons
      .filter((l) => !exclude.has(l.slug))
      .filter((l) => cefr === "all" || l.cefr_level === cefr)
      .filter((l) => skill === "all" || l.category === skill)
      .filter((l) =>
        q.trim() === ""
          ? true
          : l.title.toLowerCase().includes(q.toLowerCase()) ||
            l.slug.toLowerCase().includes(q.toLowerCase())
      );
  }, [lessons, cefr, skill, q, exclude]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded border border-border bg-background px-2 text-xs"
          value={cefr}
          onChange={(e) => setCefr(e.target.value)}
        >
          <option value="all">All CEFR</option>
          {CEFR_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded border border-border bg-background px-2 text-xs"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
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
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} lessons
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded border border-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            No lessons match the filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => (
              <li
                key={l.slug}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {l.cefr_level.toUpperCase()} · {l.category} · {l.exercise_count} ex · {l.estimated_minutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {l.xp_reward} XP
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => onPick(l.slug)}
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
