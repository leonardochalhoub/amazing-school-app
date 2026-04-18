"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Mic,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  saveCustomDialog,
  deleteCustomDialog,
  type CustomDialog,
  type CustomDialogTurn,
} from "@/lib/actions/custom-dialogs";

type EditableTurn =
  | { speaker: "ai"; text: string; pt: string }
  | { speaker: "user"; target: string; pt_hint: string };

function seedTurns(turns: CustomDialogTurn[]): EditableTurn[] {
  if (turns.length > 0) {
    return turns.map((t) =>
      t.speaker === "ai"
        ? { speaker: "ai", text: t.text, pt: t.pt ?? "" }
        : { speaker: "user", target: t.target, pt_hint: t.pt_hint ?? "" },
    );
  }
  return [
    { speaker: "ai", text: "", pt: "" },
    { speaker: "user", target: "", pt_hint: "" },
  ];
}

interface Props {
  initial?: CustomDialog | null;
}

export function CustomDialogEditor({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [character, setCharacter] = useState(initial?.character ?? "");
  const [band, setBand] = useState(initial?.band ?? "b1");
  const [ptSummary, setPtSummary] = useState(initial?.pt_summary ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);
  const [turns, setTurns] = useState<EditableTurn[]>(
    seedTurns(initial?.turns ?? []),
  );
  const [pending, startTransition] = useTransition();

  function setTurn(i: number, next: EditableTurn) {
    setTurns((prev) => prev.map((t, idx) => (idx === i ? next : t)));
  }
  function moveTurn(i: number, dir: -1 | 1) {
    setTurns((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeTurn(i: number) {
    setTurns((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addAiTurn() {
    setTurns((prev) => [...prev, { speaker: "ai", text: "", pt: "" }]);
  }
  function addUserTurn() {
    setTurns((prev) => [
      ...prev,
      { speaker: "user", target: "", pt_hint: "" },
    ]);
  }
  function toggleSpeaker(i: number) {
    setTurns((prev) =>
      prev.map((t, idx) => {
        if (idx !== i) return t;
        if (t.speaker === "ai") {
          return { speaker: "user", target: t.text, pt_hint: t.pt };
        }
        return { speaker: "ai", text: t.target, pt: t.pt_hint };
      }),
    );
  }

  function save() {
    startTransition(async () => {
      const payload = {
        id: initial?.id,
        title,
        character,
        band,
        pt_summary: ptSummary,
        turns: turns.map((t) =>
          t.speaker === "ai"
            ? { speaker: "ai", text: t.text, pt: t.pt || undefined }
            : { speaker: "user", target: t.target, pt_hint: t.pt_hint || undefined },
        ),
        is_public: isPublic,
      };
      const res = await saveCustomDialog(payload);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(initial?.id ? "Dialog updated." : "Dialog created.");
      router.push("/speaking-lab/my-dialogs");
      router.refresh();
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (!confirm(`Delete "${initial.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCustomDialog(initial.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted.");
      router.push("/speaking-lab/my-dialogs");
      router.refresh();
    });
  }

  const userTurnCount = turns.filter((t) => t.speaker === "user").length;
  const aiTurnCount = turns.length - userTurnCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {initial?.id ? "Edit dialog" : "New dialog"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Flag each turn as <span className="font-medium">AI</span>{" "}
            (Amazing School reads it aloud) or{" "}
            <span className="font-medium">User</span> (student records and gets
            scored).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {initial?.id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={remove}
              disabled={pending}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid min-w-0 gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ordering coffee in Lisbon"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Character (the AI voice)</Label>
            <Input
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              placeholder="e.g. Barista, Manager, Bia"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level band</Label>
            <select
              value={band}
              onChange={(e) => setBand(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="a1">A1</option>
              <option value="a2">A2</option>
              <option value="b1">B1</option>
              <option value="b2">B2</option>
              <option value="c1">C1</option>
              <option value="c2">C2</option>
              <option value="y4">Y4 · Professional</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Short PT summary (shown to students)</Label>
            <Input
              value={ptSummary}
              onChange={(e) => setPtSummary(e.target.value)}
              placeholder="Contexto em português"
            />
          </div>
          <label className="col-span-full flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              <strong>Share with my students</strong> — when checked, every
              student in classrooms I own can practice this dialog inside
              Speaking Lab.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Turns · {turns.length}
          <span className="ml-2 text-xs normal-case text-muted-foreground">
            {aiTurnCount} AI · {userTurnCount} user
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addAiTurn}
            className="gap-1.5"
          >
            <Volume2 className="h-4 w-4" />
            Add AI line
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addUserTurn}
            className="gap-1.5"
          >
            <Mic className="h-4 w-4" />
            Add user line
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {turns.map((t, i) => (
          <li key={i}>
            <TurnRow
              turn={t}
              index={i}
              total={turns.length}
              onChange={(next) => setTurn(i, next)}
              onMove={(dir) => moveTurn(i, dir)}
              onRemove={() => removeTurn(i)}
              onToggle={() => toggleSpeaker(i)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TurnRow({
  turn,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onToggle,
}: {
  turn: EditableTurn;
  index: number;
  total: number;
  onChange: (next: EditableTurn) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 shadow-xs ${
        turn.speaker === "user"
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            #{index + 1}
          </span>
          <Badge
            variant={turn.speaker === "user" ? "default" : "secondary"}
            className="gap-1 text-[10px]"
          >
            {turn.speaker === "user" ? (
              <>
                <Mic className="h-3 w-3" />
                User (scored)
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3" />
                AI voice
              </>
            )}
          </Badge>
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Flip
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {turn.speaker === "ai" ? (
        <div className="space-y-2">
          <Textarea
            value={turn.text}
            onChange={(e) => onChange({ ...turn, text: e.target.value })}
            rows={2}
            placeholder="English line the AI voice will read aloud"
          />
          <Input
            value={turn.pt}
            onChange={(e) => onChange({ ...turn, pt: e.target.value })}
            placeholder="Optional PT translation"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={turn.target}
            onChange={(e) => onChange({ ...turn, target: e.target.value })}
            rows={2}
            placeholder="English sentence the student must say"
          />
          <Input
            value={turn.pt_hint}
            onChange={(e) => onChange({ ...turn, pt_hint: e.target.value })}
            placeholder="Optional PT hint shown while recording"
          />
        </div>
      )}
    </div>
  );
}

export function CustomDialogList({ items }: { items: CustomDialog[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="text-sm font-medium">No dialogs yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Build a dialog flagging which lines the AI reads and which the student
          must speak.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((d) => {
        const userTurns = d.turns.filter((t) => t.speaker === "user").length;
        return (
          <li key={d.id}>
            <a
              href={`/speaking-lab/my-dialogs/${d.id}`}
              className="block rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{d.title}</p>
                {d.band ? (
                  <Badge variant="outline" className="text-[10px]">
                    {d.band.toUpperCase()}
                  </Badge>
                ) : null}
                <Badge
                  variant={d.is_public ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {d.is_public ? "Shared with students" : "Private"}
                </Badge>
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  {d.turns.length} turns · {userTurns} user
                </span>
              </div>
              {d.pt_summary ? (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  {d.pt_summary}
                </p>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function PlusCreateButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/speaking-lab/my-dialogs/new")}
      className="gap-1.5"
    >
      <Plus className="h-4 w-4" />
      New dialog
    </Button>
  );
}
