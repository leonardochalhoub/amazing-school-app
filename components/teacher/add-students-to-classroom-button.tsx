"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
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
import {
  addRosterStudentsToClassroom,
  listRosterStudentsAvailableForClassroom,
  type AvailableRosterStudent,
} from "@/lib/actions/roster";

interface Props {
  classroomId: string;
  classroomName: string;
}

/**
 * Dialog trigger on the classroom page: lists every roster student
 * the teacher has that ISN'T already in this classroom, with a
 * "current classroom" hint so the teacher sees they're moving
 * someone rather than adding a duplicate. Multi-select + Add.
 *
 * Data is lazy-loaded on dialog open so the classroom page stays
 * fast when the button isn't clicked.
 */
export function AddStudentsToClassroomButton({
  classroomId,
  classroomName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<AvailableRosterStudent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listRosterStudentsAvailableForClassroom(classroomId)
      .then((rows) => setStudents(rows))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
    // Reset selection every time the dialog opens so a stale
    // pick from a previous session never leaks through.
    setSelected(new Set());
    setQuery("");
  }, [open, classroomId]);

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
      const res = await addRosterStudentsToClassroom({
        classroomId,
        rosterStudentIds: [...selected],
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Added ${res.moved} student${res.moved === 1 ? "" : "s"} to ${classroomName}.`,
      );
      setOpen(false);
      router.refresh();
    });
  }

  const filtered = query.trim()
    ? students.filter((s) => {
        const q = query.trim().toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          (s.email ?? "").toLowerCase().includes(q)
        );
      })
    : students;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add students
      </Button>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add students to {classroomName}</DialogTitle>
          <DialogDescription>
            Pick from your roster. Students currently in another
            classroom will be <em>moved</em> here — their history
            stays with them either way.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="pl-7"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading roster…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {students.length === 0
                ? "Every roster student is already in this classroom."
                : "No matches for that search."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => {
                const checked = selected.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        checked ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {s.full_name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {s.email ?? "no email"}
                          {s.current_classroom_name
                            ? ` · currently in ${s.current_classroom_name}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
            onClick={submit}
            disabled={pending || selected.size === 0}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
