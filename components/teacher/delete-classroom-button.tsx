"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteClassroom } from "@/lib/actions/classroom";

interface Props {
  classroomId: string;
  classroomName: string;
  studentCount: number;
}

/**
 * Destructive action — gated behind a confirmation dialog that
 * requires the teacher to type the classroom name exactly to
 * enable the Delete button. Same pattern GitHub uses for repo
 * deletion, eliminates accidental click-through.
 */
export function DeleteClassroomButton({
  classroomId,
  classroomName,
  studentCount,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  // Accept case-insensitive match and collapse whitespace on both
  // sides — so a classroom saved with a trailing space, double
  // spaces, or slightly different casing ("Paulo Roberto" saved as
  // "paulo roberto" or " Paulo  Roberto ") still confirms. The
  // safeguard's point is to kill accidental click-through, not to
  // demand a forensic match.
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, " ").toLowerCase();
  const canDelete =
    confirmText.length > 0 && normalize(confirmText) === normalize(classroomName);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmText("");
  }

  function submit() {
    if (!canDelete) return;
    startTransition(async () => {
      const res = await deleteClassroom({ classroomId });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${classroomName} deleted.`);
      router.push("/teacher");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {classroomName}?</DialogTitle>
          <DialogDescription className="space-y-2 pt-2 text-sm">
            <span className="block">
              The classroom itself, its pending invitations, and its
              scheduled meetings go away permanently.
            </span>
            <span className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              Student history is kept: assignments, lessons completed,
              XP earned, notes, and AI-tutor chats stay on each
              student's record — the classroom tag on those entries
              just drops to "none".
            </span>
            {studentCount > 0 ? (
              <span className="block rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {studentCount} student{studentCount === 1 ? "" : "s"}{" "}
                lose{studentCount === 1 ? "s" : ""} their membership in
                this classroom. Their accounts and everything above
                remain on your roster.
              </span>
            ) : null}
            <span className="block">
              To confirm, type{" "}
              <span className="font-mono font-semibold">{classroomName}</span>{" "}
              below.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-classroom-name">Classroom name</Label>
          <Input
            id="confirm-classroom-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={classroomName}
            disabled={pending}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={pending}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={!canDelete || pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete classroom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
