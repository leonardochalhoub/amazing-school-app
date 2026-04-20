"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ChevronDown,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  reactivateRosterStudent,
  type DeletedRosterRow,
} from "@/lib/actions/roster";

interface Props {
  entries: DeletedRosterRow[];
}

/**
 * Archive-style panel at the bottom of the teacher's Management
 * tab. Collapsed by default — most teachers don't need it. Clicking
 * a student's "Restore" brings them back to the active roster
 * without touching any historical row.
 */
export function DeletedStudentsPanel({ entries }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  function restore(id: string, name: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await reactivateRosterStudent({ id });
      setPendingId(null);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${name} restored.`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer"
      >
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            Deleted students ({entries.length})
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </CardTitle>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Their historical data (payments, lessons, XP, class
            attendance, diary, AI chats) stays intact. Restoring
            brings them back to the active roster exactly where they
            were.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Last classroom</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">
                    Deleted
                  </th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.full_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.classroom_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                      {new Date(r.deleted_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => restore(r.id, r.full_name)}
                        disabled={pending}
                        className="gap-1.5"
                      >
                        {pending && pendingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
