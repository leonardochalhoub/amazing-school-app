"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveCustomDrill,
  deleteCustomDrill,
  type CustomDrill,
} from "@/lib/actions/custom-drills";

const BANDS = ["a1", "a2", "b1", "b2", "c1"] as const;

interface EditorProps {
  existing?: CustomDrill;
}

export function DrillEditor({ existing }: EditorProps) {
  const router = useRouter();
  const [target, setTarget] = useState(existing?.target ?? "");
  const [ptHint, setPtHint] = useState(existing?.pt_hint ?? "");
  const [band, setBand] = useState(existing?.band ?? "a1");
  const [focus, setFocus] = useState(existing?.focus ?? "");
  const [isPublic, setIsPublic] = useState(existing?.is_public ?? true);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!target.trim()) {
      toast.error("Target phrase is required.");
      return;
    }
    startTransition(async () => {
      const r = await saveCustomDrill({
        id: existing?.id,
        target: target.trim(),
        pt_hint: ptHint.trim() || undefined,
        band,
        focus: focus.trim() || undefined,
        is_public: isPublic,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(existing ? "Drill updated." : "Drill created.");
      router.push("/speaking-lab/my-drills");
    });
  }

  function remove() {
    if (!existing) return;
    if (
      !confirm(
        `Delete "${existing.target.slice(0, 40)}${existing.target.length > 40 ? "…" : ""}"? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteCustomDrill(existing.id);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Drill deleted.");
      router.push("/speaking-lab/my-drills");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
        <div className="space-y-1.5">
          <Label>Level</Label>
          <select
            value={band}
            onChange={(e) => setBand(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {b.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Focus / tag (optional)</Label>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. business, TH-sound, past-simple"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Target phrase</Label>
        <Textarea
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="What the student has to say out loud"
          rows={2}
          maxLength={300}
        />
        <p className="text-[11px] text-muted-foreground">
          {target.length}/300 characters
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Hint in Portuguese (optional)</Label>
        <Input
          value={ptHint}
          onChange={(e) => setPtHint(e.target.value)}
          placeholder="Uma tradução curta ou dica de pronúncia"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Visible to my students
      </label>

      <div className="flex items-center justify-between gap-2 pt-2">
        {existing ? (
          <Button
            type="button"
            variant="outline"
            onClick={remove}
            disabled={pending}
            className="gap-1.5 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link href="/speaking-lab/my-drills">
            <Button type="button" variant="outline" disabled={pending}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          </Link>
          <Button type="button" onClick={save} disabled={pending} className="gap-1.5">
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {existing ? "Save changes" : "Create drill"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DrillList({ drills }: { drills: CustomDrill[] }) {
  if (drills.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        You haven&apos;t created any custom drills yet. Click{" "}
        <strong className="text-foreground">New drill</strong> to add one.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {drills.map((d) => (
        <li key={d.id}>
          <Link
            href={`/speaking-lab/my-drills/${d.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm transition-colors hover:border-primary/40"
          >
            <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {d.band?.toUpperCase() ?? "—"}
            </span>
            {d.focus ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {d.focus}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate font-medium">
              {d.target}
            </span>
            {!d.is_public ? (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                private
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PlusCreateDrillButton() {
  return (
    <Link href="/speaking-lab/my-drills/new">
      <Button size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        New drill
      </Button>
    </Link>
  );
}
