"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  linkRosterToAuthUser,
  type UnlinkedStudent,
} from "@/lib/actions/roster";

interface Props {
  rosterId: string;
  rosterName: string;
  candidates: UnlinkedStudent[];
}

export function RosterLinkUser({ rosterId, rosterName, candidates }: Props) {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState("");
  const [pending, startTransition] = useTransition();

  function link() {
    if (!authUserId) {
      toast.error("Pick an account to link.");
      return;
    }
    startTransition(async () => {
      const r = await linkRosterToAuthUser({ rosterId, authUserId });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`Linked ${rosterName} to the selected account.`);
      router.refresh();
    });
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
          <UserPlus className="h-4 w-4" />
          No signed-in account to link yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {rosterName} isn&apos;t connected to a student account. Ask the
          student to sign up via the invitation link and they&apos;ll be
          linked automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
        <UserPlus className="h-4 w-4" />
        Link {rosterName} to an existing student account
      </p>
      <p className="text-xs text-muted-foreground">
        This student was added to the roster but isn&apos;t yet connected to a
        student account. Pick an unlinked student below and click{" "}
        <strong>Link</strong>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={authUserId}
          onChange={(e) => setAuthUserId(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Pick a student account…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
              {c.email ? ` · ${c.email}` : ""}
            </option>
          ))}
        </select>
        <Button
          onClick={link}
          disabled={pending || !authUserId}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Link
        </Button>
      </div>
    </div>
  );
}
