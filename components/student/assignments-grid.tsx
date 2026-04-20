"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface AssignmentGridEntry {
  assignmentId: string;
  kind: "lesson" | "music";
  title: string;
  subtitle: string | null;
  cefrLevel: string | null;
  minutes: number | null;
  status: "assigned" | "skipped" | "completed";
  href: string;
  assignedAt: string;
  completedAt: string | null;
}

interface Props {
  entries: AssignmentGridEntry[];
}

const PREVIEW_COUNT = 6;

export function AssignmentsGrid({ entries }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, PREVIEW_COUNT);
  const hiddenCount = entries.length - visible.length;

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {visible.map((a) => (
          <li key={a.assignmentId}>
            <AssignmentTile a={a} />
          </li>
        ))}
      </ul>
      {entries.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {showAll ? "Show less" : `Show all ${entries.length} assignments`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
          {!showAll && hiddenCount > 0 ? (
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              (+{hiddenCount})
            </span>
          ) : null}
        </button>
      ) : null}
    </>
  );
}

function AssignmentTile({ a }: { a: AssignmentGridEntry }) {
  const isDone = a.status === "completed";
  return (
    <Link href={a.href} className="group block">
      <Card
        className={`transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
          isDone ? "opacity-70" : ""
        }`}
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : a.kind === "music"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {a.kind === "music" ? (
                  <Music2 className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {a.title}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-muted-foreground">
                  {a.cefrLevel ? <span>{a.cefrLevel.toUpperCase()}</span> : null}
                  {a.subtitle ? (
                    <>
                      <span>·</span>
                      <span>{a.subtitle}</span>
                    </>
                  ) : null}
                  {a.minutes ? (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{a.minutes} min</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            {isDone ? (
              <Badge variant="default" className="text-[10px]">
                Done
              </Badge>
            ) : null}
          </div>
          <div className="space-y-0.5">
            {isDone && a.completedAt ? (
              <p className="text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">
                Done{" "}
                {new Date(a.completedAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            {a.assignedAt ? (
              <p className="text-[10px] tabular-nums text-muted-foreground">
                Assigned{" "}
                {new Date(a.assignedAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant={isDone ? "outline" : "default"}
            className="w-full gap-1.5 text-xs"
          >
            {isDone ? "Review" : "Open"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
