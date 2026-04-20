"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Users2,
  X,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkAssignManyLessons } from "@/lib/actions/assignments";
import { CEFR_BAND_LABEL, cefrBandOf, type CefrBand } from "@/lib/content/schema";

export interface BulkRow {
  slug: string;
  title: string;
  cefr_level: string;
  category: string;
  exerciseCount?: number;
  href: string;
  source?: "library" | "curated" | "mine";
  published?: boolean;
}

interface Classroom {
  id: string;
  name: string;
}
interface Student {
  id: string;
  fullName: string;
  classroomId: string | null;
}

interface Props {
  rows: BulkRow[];
  classrooms: Classroom[];
  students: Student[];
  /** When set, the bulk-assign dialog defaults to this classroom
   *  as the target and skips the classroom picker. Used when the
   *  teacher clicks "Bulk Assign" from inside a classroom page
   *  and lands here with ?classroom=<id>. */
  presetClassroomId?: string;
}

export function BulkAssignList({
  rows,
  classrooms,
  students,
  presetClassroomId,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetType, setTargetType] = useState<"classroom" | "student">(
    "classroom",
  );
  const [classroomId, setClassroomId] = useState(presetClassroomId ?? "");
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();

  // Only published rows (library items default to true) can be assigned.
  const assignable = rows.filter((r) => r.published !== false);
  const assignableSet = new Set(assignable.map((r) => r.slug));

  // Group by CEFR BAND (A1, A2, B1, …) — each band holds the full year
  // of content (both semester-1 and semester-2 sub-levels).
  const BAND_ORDER: (CefrBand | "other")[] = [
    "a1",
    "a2",
    "b1",
    "b2",
    "c1",
    "c2",
    "y4",
    "other",
  ];
  const byBand = new Map<CefrBand | "other", BulkRow[]>();
  for (const r of rows) {
    const band = cefrBandOf(r.cefr_level) ?? "other";
    const list = byBand.get(band) ?? [];
    list.push(r);
    byBand.set(band, list);
  }
  // Within a band, sort sub-levels (a1.1 before a1.2) then by title.
  for (const list of byBand.values()) {
    list.sort((a, b) => {
      const levelCmp = a.cefr_level.localeCompare(b.cefr_level);
      return levelCmp !== 0 ? levelCmp : a.title.localeCompare(b.title);
    });
  }

  function toggle(slug: string) {
    if (!assignableSet.has(slug)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(assignable.map((r) => r.slug)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function submit() {
    if (selected.size === 0) {
      toast.error("Pick at least one lesson");
      return;
    }
    // Classroom mode → required classroom id.
    // Per-student mode → roster student id required; classroom is
    // optional (a roster-only student with no classroom is still a
    // valid assignment target since migration 024 made
    // lesson_assignments.classroom_id nullable).
    let finalClassroomId: string | null = null;
    let rosterStudentId: string | null = null;
    if (targetType === "classroom") {
      if (!classroomId) return toast.error("Pick a classroom");
      finalClassroomId = classroomId;
    } else {
      if (!studentId) return toast.error("Pick a student");
      const s = students.find((x) => x.id === studentId);
      rosterStudentId = studentId;
      finalClassroomId = s?.classroomId ?? null;
    }

    startTransition(async () => {
      const res = await bulkAssignManyLessons({
        classroomId: finalClassroomId ?? undefined,
        lessonSlugs: [...selected],
        rosterStudentId,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Assigned ${res.assigned} lesson${res.assigned === 1 ? "" : "s"}` +
          (res.skipped > 0 ? ` · ${res.skipped} already assigned` : "")
      );
      setDialogOpen(false);
      clearAll();
      router.refresh();
    });
  }

  const allSelected =
    assignable.length > 0 && selected.size === assignable.length;

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={allSelected ? clearAll : selectAllVisible}
            className="font-medium text-primary hover:underline"
          >
            {allSelected ? "Clear all" : "Select all visible"}
          </button>
          <span className="text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} selected`
              : `${rows.length} lessons`}
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {BAND_ORDER.filter((b) => byBand.has(b)).map((band) => {
          const group = byBand.get(band)!;
          const heading =
            band === "other"
              ? "Other"
              : CEFR_BAND_LABEL[band];
          return (
          <section key={band} className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight">
              {heading}
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {group.length} lesson{group.length === 1 ? "" : "s"}
              </span>
            </h2>
            <div className="space-y-2">
              {group.map((row) => {
                const isSelected = selected.has(row.slug);
                const isDraft = row.published === false;
                const sourceBadge =
                  row.source === "library"
                    ? { label: "Core", variant: "default" as const }
                    : row.source === "curated"
                      ? { label: "Curated", variant: "secondary" as const }
                      : { label: "Mine", variant: "outline" as const };
                return (
                  <div
                    key={row.slug}
                    className={`flex items-center gap-2 rounded-xl border p-3 shadow-xs transition-colors ${
                      isDraft
                        ? "border-dashed border-muted bg-muted/20 opacity-60"
                        : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(row.slug)}
                      disabled={isDraft}
                      title={
                        isDraft
                          ? "Publish this lesson before assigning"
                          : undefined
                      }
                      className="h-4 w-4 shrink-0 rounded border-border accent-primary disabled:cursor-not-allowed"
                    />
                    <Link href={row.href} className="group min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold group-hover:text-primary">
                          {row.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 gap-1 text-[10px]"
                        >
                          {row.category === "narrative" ? (
                            <Sparkles className="h-3 w-3" />
                          ) : (
                            <BookOpen className="h-3 w-3" />
                          )}
                          {row.category === "narrative" ? "Story" : row.category}
                        </Badge>
                        {isDraft ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            Draft
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.cefr_level.toUpperCase()}
                        {row.exerciseCount != null
                          ? ` · ${row.exerciseCount} exercises`
                          : ""}
                        {isDraft ? " · publish to assign" : ""}
                      </p>
                    </Link>
                    <Badge
                      variant={sourceBadge.variant}
                      className="shrink-0 text-[10px]"
                    >
                      {sourceBadge.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </section>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-primary/30 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
          <span className="text-sm font-semibold">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <Users2 className="h-4 w-4" />
            Assign {selected.size}
          </Button>
          <button
            type="button"
            onClick={clearAll}
            aria-label="Clear selection"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {selected.size} lessons</DialogTitle>
            <DialogDescription>
              Pick a classroom or a specific student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTargetType("classroom")}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  targetType === "classroom"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Classroom
              </button>
              <button
                type="button"
                onClick={() => setTargetType("student")}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  targetType === "student"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                One student
              </button>
            </div>

            {targetType === "classroom" ? (
              <select
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Pick a classroom…</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Pick a student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            )}

            <p className="rounded-lg bg-muted/30 p-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Already-assigned lessons will be skipped silently.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending} className="gap-1">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users2 className="h-4 w-4" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
