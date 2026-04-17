"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { StudentNote } from "@/lib/supabase/types";
import { createNote, deleteNote } from "@/lib/actions/notes";

interface Props {
  classroomId: string;
  studentId: string;
  notes: StudentNote[];
}

export function NotesPanel({ classroomId, studentId, notes }: Props) {
  const [body, setBody] = useState("");
  const [local, setLocal] = useState<StudentNote[]>(notes);
  const [pending, startTransition] = useTransition();

  function onAdd() {
    if (body.trim().length === 0) return;
    startTransition(async () => {
      const result = await createNote({ classroomId, studentId, body: body.trim() });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setBody("");
        toast.success("Note added");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteNote({ noteId: id });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setLocal((prev) => prev.filter((n) => n.id !== id));
      }
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Private notes</h2>
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Private note — only you will see this…"
          className="w-full min-h-[80px] rounded border border-border bg-background p-2 text-sm"
          maxLength={4000}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onAdd} disabled={pending || body.trim().length === 0}>
            Add note
          </Button>
        </div>
      </div>
      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {local.map((n) => (
            <li
              key={n.id}
              className="rounded border border-border p-2 text-sm flex items-start gap-2"
            >
              <div className="flex-1">
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(n.id)}
                disabled={pending}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
