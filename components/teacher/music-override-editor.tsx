"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Headphones,
  Layers,
  Link as LinkIcon,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertMusicOverride,
  resetMusicOverride,
} from "@/lib/actions/music-overrides";
import type {
  MusicExercise,
  MusicSong,
  SingAlongPrompt,
} from "@/lib/content/music";

interface Props {
  song: MusicSong;
  initialSingAlong: { prompts: SingAlongPrompt[] };
  initialExercises: MusicExercise[];
  hasOverride: boolean;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function MusicOverrideEditor({
  song,
  initialSingAlong,
  initialExercises,
  hasOverride,
}: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<SingAlongPrompt[]>(
    initialSingAlong.prompts
  );
  const [exercises, setExercises] = useState<MusicExercise[]>(initialExercises);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const embedSrc =
    startAt !== null
      ? `https://www.youtube.com/embed/${song.youtube_id}?enablejsapi=1&rel=0&modestbranding=1&start=${startAt}&autoplay=1`
      : `https://www.youtube.com/embed/${song.youtube_id}?enablejsapi=1&rel=0&modestbranding=1`;

  function playAt(s: number) {
    setStartAt(s);
  }

  function updatePrompt(i: number, p: SingAlongPrompt) {
    setPrompts((prev) => prev.map((q, idx) => (idx === i ? p : q)));
    setDirty(true);
  }
  function movePrompt(i: number, dir: -1 | 1) {
    setPrompts((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }
  function removePrompt(i: number) {
    setPrompts((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }
  function addPrompt() {
    if (prompts.length >= 4) return;
    setPrompts((prev) => [
      ...prev,
      {
        label_en: "Sing this part",
        label_pt: "Cante esta parte",
        lines: [""],
        start_seconds: 0,
        style: "chorus",
      },
    ]);
    setDirty(true);
  }

  function addExercise(type: MusicExercise["type"]) {
    const defaults: Record<string, MusicExercise> = {
      translate_line: {
        type: "translate_line",
        prompt_en: "Translate this line to Portuguese:",
        prompt_pt: "Traduza esta linha para português:",
        excerpt: "",
        model_answer_pt: "",
      },
      discussion: {
        type: "discussion",
        prompt_en: "",
        prompt_pt: "",
        target_vocab: [],
      },
      listen_and_fill: {
        type: "listen_and_fill",
        prompt_en: "Listen and fill the blank:",
        prompt_pt: "Escute e complete a lacuna:",
        excerpt_before: "",
        excerpt_after: "",
        blank_hint: "",
        answer: "",
        youtube_start: 0,
        youtube_end: 14,
      },
      spot_the_grammar: {
        type: "spot_the_grammar",
        prompt_en: "Write the full form of each contraction:",
        prompt_pt: "Escreva a forma completa de cada contração:",
        expected: [
          { short: "I'm", full: "I am" },
          { short: "don't", full: "do not" },
        ],
      },
      word_to_meaning: {
        type: "word_to_meaning",
        prompt_en: "Match each word to its translation.",
        prompt_pt: "Associe cada palavra à sua tradução.",
        pairs: [
          { en: "", pt: "" },
          { en: "", pt: "" },
          { en: "", pt: "" },
        ],
      },
    };
    const next = defaults[type];
    if (next) {
      setExercises((prev) => [...prev, next]);
      setDirty(true);
    }
  }
  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }
  function moveExercise(i: number, dir: -1 | 1) {
    setExercises((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }
  function updateExercise(i: number, next: MusicExercise) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? next : e)));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const r = await upsertMusicOverride({
        music_slug: song.slug,
        sing_along: { prompts },
        exercises,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Override saved — your classroom will see the new version.");
      setDirty(false);
      router.refresh();
    });
  }
  function reset() {
    if (
      !confirm(
        "Reset to the canonical song (discard all your edits)? This cannot be undone."
      )
    )
      return;
    startTransition(async () => {
      const r = await resetMusicOverride(song.slug);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Reset. Your students will see the canonical version.");
      router.push(`/teacher/music/${song.slug}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Personalize {song.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Override sing-along timings and exercises for your classroom. Only
            your students see this version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasOverride ? (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={pending}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to canonical
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={save}
            disabled={pending || !dirty}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-black">
                <iframe
                  ref={iframeRef}
                  key={startAt ?? "initial"}
                  src={embedSrc}
                  title={`${song.title} — ${song.artist}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="space-y-2 p-4 text-xs text-muted-foreground">
                <p>
                  <strong>{song.artist}</strong> · {song.cefr_level.toUpperCase()} ·{" "}
                  {fmt(song.duration_seconds)}
                </p>
                <p>
                  Use the <span className="font-mono">▶</span> buttons below to
                  scrub the video to each timestamp and verify.
                </p>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Sing-along prompts
                <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                  {prompts.length} / 4
                </span>
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={addPrompt}
                disabled={prompts.length >= 4}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add prompt
              </Button>
            </div>
            {prompts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No sing-along prompts. Add one to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {prompts.map((p, i) => (
                  <li key={i}>
                    <PromptEditor
                      prompt={p}
                      index={i}
                      total={prompts.length}
                      onChange={(next) => updatePrompt(i, next)}
                      onRemove={() => removePrompt(i)}
                      onMove={(dir) => movePrompt(i, dir)}
                      onPlay={() => playAt(p.start_seconds)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Exercises
                <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                  {exercises.length}
                </span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExercise("listen_and_fill")}
                  className="gap-1 text-xs"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  + Listen & fill
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExercise("translate_line")}
                  className="gap-1 text-xs"
                >
                  <Languages className="h-3.5 w-3.5" />
                  + Translate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExercise("discussion")}
                  className="gap-1 text-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  + Discussion
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExercise("spot_the_grammar")}
                  className="gap-1 text-xs"
                >
                  <Layers className="h-3.5 w-3.5" />
                  + Contractions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addExercise("word_to_meaning")}
                  className="gap-1 text-xs"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  + Matching
                </Button>
              </div>
            </div>
            {exercises.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No exercises. Add one above.
              </p>
            ) : (
              <ul className="space-y-2">
                {exercises.map((ex, i) => (
                  <li key={i}>
                    <ExerciseSummary
                      exercise={ex}
                      index={i}
                      total={exercises.length}
                      onMove={(dir) => moveExercise(i, dir)}
                      onRemove={() => removeExercise(i)}
                      onChange={(next) => updateExercise(i, next)}
                      onPlayAt={playAt}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardContent className="space-y-2 p-4 text-xs">
              <p className="font-semibold">How this works</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  · Edits apply only to students in classrooms you own.
                </li>
                <li>
                  · Click <span className="font-mono">▶ time</span> to preview
                  that moment in the video.
                </li>
                <li>
                  · Use <strong>Save changes</strong> to push to your students.
                </li>
                <li>
                  · Use <strong>Reset to canonical</strong> to revert to the
                  default song version.
                </li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PromptEditor({
  prompt,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onPlay,
}: {
  prompt: SingAlongPrompt;
  index: number;
  total: number;
  onChange: (p: SingAlongPrompt) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onPlay: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prompt #{index + 1}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Clock className="h-3 w-3" />
            ▶ {fmt(prompt.start_seconds)}
          </button>
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Label (EN)</Label>
          <Input
            value={prompt.label_en}
            onChange={(e) => onChange({ ...prompt, label_en: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Label (PT)</Label>
          <Input
            value={prompt.label_pt}
            onChange={(e) => onChange({ ...prompt, label_pt: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[120px_120px]">
        <div className="space-y-1.5">
          <Label>Start (seconds)</Label>
          <Input
            type="number"
            min={0}
            max={3600}
            value={prompt.start_seconds}
            onChange={(e) =>
              onChange({
                ...prompt,
                start_seconds: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Style</Label>
          <select
            value={prompt.style ?? "chorus"}
            onChange={(e) =>
              onChange({
                ...prompt,
                style: e.target.value as SingAlongPrompt["style"],
              })
            }
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="chorus">Chorus</option>
            <option value="verse">Verse</option>
            <option value="bridge">Bridge</option>
            <option value="hook">Hook</option>
          </select>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label>Lines (one per line)</Label>
        <textarea
          value={prompt.lines.join("\n")}
          onChange={(e) =>
            onChange({
              ...prompt,
              lines: e.target.value
                .split("\n")
                .map((l) => l.trimEnd())
                .filter((l) => l.length > 0)
                .slice(0, 10),
            })
          }
          rows={Math.max(3, prompt.lines.length + 1)}
          className="w-full rounded-md border border-border bg-background p-2 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function ExerciseSummary({
  exercise,
  index,
  total,
  onMove,
  onRemove,
  onChange,
  onPlayAt,
}: {
  exercise: MusicExercise;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onChange: (e: MusicExercise) => void;
  onPlayAt?: (seconds: number) => void;
}) {
  const editable =
    exercise.type === "translate_line" ||
    exercise.type === "discussion" ||
    exercise.type === "listen_and_fill" ||
    exercise.type === "spot_the_grammar" ||
    exercise.type === "word_to_meaning";
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            #{index + 1} · {exercise.type.replace(/_/g, " ")}
          </p>
          <p className="mt-0.5 truncate text-sm">
            {"excerpt" in exercise
              ? exercise.excerpt
              : "prompt_en" in exercise
                ? exercise.prompt_en
                : "—"}
          </p>
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
      {editable && exercise.type === "translate_line" ? (
        <div className="mt-3 space-y-1.5">
          <Input
            value={exercise.excerpt}
            onChange={(e) => onChange({ ...exercise, excerpt: e.target.value })}
            placeholder="English excerpt"
          />
          <Input
            value={exercise.model_answer_pt ?? ""}
            onChange={(e) =>
              onChange({ ...exercise, model_answer_pt: e.target.value })
            }
            placeholder="Portuguese translation (model)"
          />
        </div>
      ) : null}
      {editable && exercise.type === "discussion" ? (
        <div className="mt-3 space-y-1.5">
          <textarea
            value={exercise.prompt_en}
            onChange={(e) => onChange({ ...exercise, prompt_en: e.target.value })}
            rows={2}
            placeholder="Discussion prompt (English)"
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <textarea
            value={exercise.prompt_pt}
            onChange={(e) => onChange({ ...exercise, prompt_pt: e.target.value })}
            rows={2}
            placeholder="Enunciado (Português)"
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          />
        </div>
      ) : null}
      {editable && exercise.type === "listen_and_fill" ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr]">
            <Input
              value={exercise.excerpt_before}
              onChange={(e) =>
                onChange({ ...exercise, excerpt_before: e.target.value })
              }
              placeholder="Words before the blank"
            />
            <Input
              value={exercise.answer}
              onChange={(e) => onChange({ ...exercise, answer: e.target.value })}
              placeholder="Correct answer"
              className="md:w-36"
            />
            <Input
              value={exercise.excerpt_after}
              onChange={(e) =>
                onChange({ ...exercise, excerpt_after: e.target.value })
              }
              placeholder="Words after the blank"
            />
          </div>
          <Input
            value={exercise.blank_hint}
            onChange={(e) =>
              onChange({ ...exercise, blank_hint: e.target.value })
            }
            placeholder="Hint for the blank"
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground">
              Start (s)
            </label>
            <Input
              type="number"
              min={0}
              max={3600}
              value={exercise.youtube_start}
              onChange={(e) =>
                onChange({
                  ...exercise,
                  youtube_start: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="h-8 w-20"
            />
            <label className="text-[11px] text-muted-foreground">End (s)</label>
            <Input
              type="number"
              min={0}
              max={3600}
              value={exercise.youtube_end}
              onChange={(e) =>
                onChange({
                  ...exercise,
                  youtube_end: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="h-8 w-20"
            />
            {onPlayAt ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPlayAt(exercise.youtube_start)}
                className="gap-1 text-xs"
              >
                <Clock className="h-3 w-3" />
                ▶ {fmt(exercise.youtube_start)}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {editable && exercise.type === "spot_the_grammar" ? (
        <div className="mt-3 space-y-1.5">
          {exercise.expected.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={entry.short}
                onChange={(e) =>
                  onChange({
                    ...exercise,
                    expected: exercise.expected.map((x, idx) =>
                      idx === i ? { ...x, short: e.target.value } : x
                    ),
                  })
                }
                placeholder="Contraction"
                className="h-8 w-28"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                value={entry.full}
                onChange={(e) =>
                  onChange({
                    ...exercise,
                    expected: exercise.expected.map((x, idx) =>
                      idx === i ? { ...x, full: e.target.value } : x
                    ),
                  })
                }
                placeholder="Full form"
                className="h-8 flex-1"
              />
              {exercise.expected.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...exercise,
                      expected: exercise.expected.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {exercise.expected.length < 6 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...exercise,
                  expected: [...exercise.expected, { short: "", full: "" }],
                })
              }
              className="text-xs"
            >
              + Contraction
            </Button>
          ) : null}
        </div>
      ) : null}
      {editable && exercise.type === "word_to_meaning" ? (
        <div className="mt-3 space-y-1.5">
          {exercise.pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={pair.en}
                onChange={(e) =>
                  onChange({
                    ...exercise,
                    pairs: exercise.pairs.map((x, idx) =>
                      idx === i ? { ...x, en: e.target.value } : x
                    ),
                  })
                }
                placeholder="English"
                className="h-8 flex-1"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                value={pair.pt}
                onChange={(e) =>
                  onChange({
                    ...exercise,
                    pairs: exercise.pairs.map((x, idx) =>
                      idx === i ? { ...x, pt: e.target.value } : x
                    ),
                  })
                }
                placeholder="Português"
                className="h-8 flex-1"
              />
              {exercise.pairs.length > 2 ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...exercise,
                      pairs: exercise.pairs.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {exercise.pairs.length < 8 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...exercise,
                  pairs: [...exercise.pairs, { en: "", pt: "" }],
                })
              }
              className="text-xs"
            >
              + Pair
            </Button>
          ) : null}
        </div>
      ) : null}
      {!editable ? (
        <p className="mt-2 text-[11px] italic text-muted-foreground">
          Auto-generated — can be removed or reordered. Inline editing coming
          soon for this type.
        </p>
      ) : null}
    </div>
  );
}
