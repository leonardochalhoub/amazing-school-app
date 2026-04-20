"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeRosterStudentsFromClassroom } from "@/lib/actions/roster";

export interface RemoveCandidate {
  rosterStudentId: string;
  fullName: string;
}

interface Props {
  classroomId: string;
  classroomName: string;
  students: RemoveCandidate[];
}

/**
 * Dialog trigger inside a classroom page. Lists current roster
 * students (passed in from the server), multi-select + confirm to
 * detach them from the classroom. They stay on the teacher's
 * roster (unattached) — every assignment, XP event, payment, and
 * note they accumulated INSIDE this classroom stays intact.
 */
export function RemoveStudentsFromClassroomButton({
  classroomId,
  classroomName,
  students,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (students.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      toast.error("Pick at least one student");
      return;
    }
    startTransition(async () => {
      const res = await removeRosterStudentsFromClassroom({
        classroomId,
        rosterStudentIds: [...selected],
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Removed ${res.removed} student${res.removed === 1 ? "" : "s"} from ${classroomName}.`,
      );
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (pending) return;
        setOpen(v);
        if (!v) setSelected(new Set());
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserMinus className="h-3.5 w-3.5" />
        Remove students
      </Button>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove students from {classroomName}</DialogTitle>
          <DialogDescription>
            The students stay on your roster (unattached to any
            classroom). Every assignment, XP, lesson, payment, and
            note they collected here stays tagged with this
            classroom for the record.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {students.map((s) => {
              const checked = selected.has(s.rosterStudentId);
              return (
                <li key={s.rosterStudentId}>
                  <button
                    type="button"
                    onClick={() => toggle(s.rosterStudentId)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      checked ? "bg-destructive/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border"
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="font-medium">{s.fullName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={pending || selected.size === 0}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserMinus className="h-3.5 w-3.5" />
            )}
            Remove {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
