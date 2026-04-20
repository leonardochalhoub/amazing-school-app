"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type { LessonAssignment } from "@/lib/supabase/types";
import type { LessonMeta } from "@/lib/content/loader";
import {
  assignLesson,
  unassign,
  reorderForStudent,
  setAssignmentStatus,
} from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LessonPicker } from "./lesson-picker";

interface AssignmentRow extends LessonAssignment {
  lesson?: LessonMeta;
}

interface Props {
  classroomId: string;
  studentId: string;
  assignments: AssignmentRow[];
  allLessons: LessonMeta[];
}

export function AssignmentManager({
  classroomId,
  studentId,
  assignments,
  allLessons,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<AssignmentRow[]>(assignments);
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 10;
  const visible = showAll ? local : local.slice(0, PREVIEW);

  const assignedSlugs = local.map((a) => a.lesson_slug);

  function pick(slug: string) {
    const nextOrder = local.length;
    startTransition(async () => {
      const result = await assignLesson({
        classroomId,
        lessonSlug: slug,
        studentId,
        orderIndex: nextOrder,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lesson assigned");
        setOpen(false);
      }
    });
  }

  function onUnassign(id: string) {
    startTransition(async () => {
      const result = await unassign({ assignmentId: id });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setLocal((prev) => prev.filter((a) => a.id !== id));
        toast.success("Unassigned");
      }
    });
  }

  function onMove(id: string, delta: number) {
    const idx = local.findIndex((a) => a.id === id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= local.length) return;
    const next = [...local];
    [next[idx], next[target]] = [next[target], next[idx]];
    setLocal(next);
    startTransition(async () => {
      const result = await reorderForStudent({
        classroomId,
        studentId,
        ordered: next.map((a) => a.id),
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      }
    });
  }

  function onStatus(id: string, status: "assigned" | "skipped" | "completed") {
    startTransition(async () => {
      const result = await setAssignmentStatus({ assignmentId: id, status });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setLocal((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Assigned lessons</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="sm" onClick={() => setOpen(true)}>Assign lesson</Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign to this student</DialogTitle>
            </DialogHeader>
            <LessonPicker
              lessons={allLessons}
              onPick={pick}
              pending={pending}
              excludeSlugs={assignedSlugs}
            />
          </DialogContent>
        </Dialog>
      </div>

      {local.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded">
          No lessons assigned yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded border border-border">
          {visible.map((a, i) => (
            <li
              key={a.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="w-8 text-center tabular-nums text-xs text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {a.lesson?.title ?? a.lesson_slug}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {a.student_id ? "Per-student" : "Classroom-wide"}
                </p>
              </div>
              <Badge
                variant={a.status === "completed" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {a.status}
              </Badge>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMove(a.id, -1)}
                  disabled={i === 0 || pending}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMove(a.id, 1)}
                  disabled={i === local.length - 1 || pending}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onStatus(a.id, a.status === "skipped" ? "assigned" : "skipped")
                  }
                  disabled={pending}
                >
                  {a.status === "skipped" ? "Restore" : "Skip"}
                </Button>
                {a.student_id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUnassign(a.id)}
                    disabled={pending}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {local.length > PREVIEW ? (
            <li>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                {showAll
                  ? "Show less"
                  : `Show all ${local.length} lessons`}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
                />
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
