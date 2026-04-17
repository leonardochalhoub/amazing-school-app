"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { LessonMeta } from "@/lib/content/loader";
import { bulkAssignToClassroom } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LessonPicker } from "./lesson-picker";

interface Props {
  classroomId: string;
  lessons: LessonMeta[];
  alreadyAssignedSlugs?: string[];
}

export function BulkAssignButton({
  classroomId,
  lessons,
  alreadyAssignedSlugs = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function pick(slug: string) {
    startTransition(async () => {
      const result = await bulkAssignToClassroom({
        classroomId,
        lessonSlug: slug,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Assigned to all students");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Assign to all
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk assign to classroom</DialogTitle>
        </DialogHeader>
          <LessonPicker
            lessons={lessons}
            onPick={pick}
            pending={pending}
            excludeSlugs={alreadyAssignedSlugs}
            pickLabel="Assign to all"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
