"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Music2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RecentAssignmentRow {
  assignmentId: string;
  kind: "lesson" | "music";
  slug: string;
  title: string;
  cefr: string | null;
  category: string | null;
  minutes: number | null;
  scope: "classroom-wide" | "per-student";
  classroomName: string;
  targetStudentName: string | null;
  assignedAt: string;
  status: "assigned" | "skipped" | "completed";
}

interface Props {
  entries: RecentAssignmentRow[];
}

const PREVIEW = 15;

export function RecentAssignmentsPreview({ entries }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, PREVIEW);
  const hidden = entries.length - visible.length;

  return (
    <>
      <ul className="space-y-2">
        {visible.map((a) => {
          const href =
            a.kind === "music"
              ? `/student/music/${a.slug}`
              : `/student/lessons/${a.slug}`;
          return (
            <li
              key={a.assignmentId}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs"
            >
              {a.kind === "music" ? (
                <Music2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={href}
                  className="truncate text-sm font-semibold hover:text-primary"
                >
                  {a.title}
                </Link>
                <p className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                  {a.cefr ? <span>{a.cefr.toUpperCase()}</span> : null}
                  {a.cefr && a.category ? <span>·</span> : null}
                  {a.category ? <span>{a.category}</span> : null}
                  {a.minutes ? <span>·</span> : null}
                  {a.minutes ? (
                    <span className="tabular-nums">{a.minutes} min</span>
                  ) : null}
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    {a.scope === "classroom-wide" ? (
                      <Users className="h-3 w-3" />
                    ) : (
                      <UserRound className="h-3 w-3" />
                    )}
                    {a.scope === "classroom-wide"
                      ? `Whole class (${a.classroomName})`
                      : `Assigned to ${a.targetStudentName ?? "student"}`}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(a.assignedAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              </div>
              <Badge
                variant={
                  a.status === "completed"
                    ? "default"
                    : a.status === "skipped"
                      ? "outline"
                      : "secondary"
                }
                className="text-[10px]"
              >
                {a.status}
              </Badge>
            </li>
          );
        })}
      </ul>
      {entries.length > PREVIEW ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {showAll
            ? "Show less"
            : `Show all ${entries.length} assignments`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
          {!showAll && hidden > 0 ? (
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              (+{hidden})
            </span>
          ) : null}
        </button>
      ) : null}
    </>
  );
}
