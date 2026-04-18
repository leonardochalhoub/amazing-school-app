"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";
import { SceneIllustration } from "./scene-illustration";
import { RecordExercise } from "./record-exercise";
import { SpeakButton } from "./speak-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { markLessonComplete } from "@/lib/actions/lesson-completion";
import type {
  LessonScene,
  NarrativeLesson,
  Character,
} from "@/lib/content/scenes";

interface Props {
  lesson: NarrativeLesson;
  characters: Record<string, Character>;
}

export function NarrativePlayer({ lesson, characters }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const scene = lesson.scenes[index];
  const isLast = index === lesson.scenes.length - 1;
  const progress = ((index + 1) / lesson.scenes.length) * 100;

  function next() {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  }

  async function finish() {
    setSubmitting(true);
    const res = await markLessonComplete({
      lessonSlug: lesson.slug,
      xpReward: lesson.xp_reward,
    });
    setSubmitting(false);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    if ("success" in res) {
      toast.success(
        res.alreadyCompleted
          ? "Lesson already completed — no extra XP this time."
          : `Lesson complete! +${res.awardedXp} XP`,
        { icon: "🎉" }
      );
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* progress + meta */}
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {lesson.title}
        </span>
        <span>
          Scene {index + 1} of {lesson.scenes.length}
        </span>
      </div>
      <div className="mb-6 h-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <SceneRenderer
            scene={scene}
            characters={characters}
            onAdvance={next}
            submitting={submitting}
            isLast={isLast}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SceneRenderer({
  scene,
  characters,
  onAdvance,
  submitting,
  isLast,
}: {
  scene: LessonScene;
  characters: Record<string, Character>;
  onAdvance: () => void;
  submitting: boolean;
  isLast: boolean;
}) {
  if (scene.kind === "chapter_title") {
    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-10 text-center text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.3),transparent_60%)]" />
          <Sparkles className="relative mx-auto h-10 w-10" />
          <h2 className="relative mt-3 text-3xl font-extrabold tracking-tight">
            {scene.chapter}
          </h2>
          {scene.subtitle_en ? (
            <p className="relative mt-2 text-sm italic opacity-90">
              {scene.subtitle_en}
            </p>
          ) : null}
          {scene.subtitle_pt ? (
            <p className="relative text-xs opacity-75">{scene.subtitle_pt}</p>
          ) : null}
        </div>
        <AdvanceButton onClick={onAdvance} isLast={isLast} submitting={submitting} />
      </div>
    );
  }

  if (scene.kind === "narrative") {
    const char = scene.character_id ? characters[scene.character_id] : null;
    // Every narrative scene gets an illustration. Use the scene_emoji hint
    // when present; otherwise fall back to the character's emoji.
    const hintEmoji = scene.scene_emoji ?? char?.emoji;
    return (
      <div className="space-y-5">
        {hintEmoji ? (
          <SceneIllustration
            emoji={hintEmoji}
            color={char?.color ?? "#6366f1"}
            promptText={scene.text_en}
            characterHint={
              char ? `${char.name} — ${char.one_liner_en}` : undefined
            }
          />
        ) : null}
        {char ? <CharacterPortrait char={char} /> : null}
        <div className="flex items-start gap-2">
          <SpeakButton text={scene.text_en} />
          <p className="whitespace-pre-line text-lg leading-relaxed font-medium flex-1">
            {scene.text_en}
          </p>
        </div>
        {scene.text_pt ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground italic border-l-2 border-muted pl-3">
            {scene.text_pt}
          </p>
        ) : null}
        <AdvanceButton onClick={onAdvance} isLast={isLast} submitting={submitting} />
      </div>
    );
  }

  if (scene.kind === "dialogue") {
    return (
      <div className="space-y-3">
        {scene.location_en ? (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            📍 {scene.location_en}
          </p>
        ) : null}
        <div className="space-y-3">
          {scene.turns.map((turn, i) => {
            const char = characters[turn.character_id];
            return <DialogueBubble key={i} char={char} en={turn.en} pt={turn.pt} />;
          })}
        </div>
        <AdvanceButton onClick={onAdvance} isLast={isLast} submitting={submitting} />
      </div>
    );
  }

  if (scene.kind === "vocab_intro") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-primary">
            {scene.title ?? "New vocabulary"}
          </h3>
        </div>
        <div className="grid gap-2">
          {scene.items.map((it) => (
            <div
              key={it.term}
              className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SpeakButton
                  text={it.example_en ?? it.term.replace(/\s\/.*$/, "")}
                />
                <strong className="text-lg font-bold text-foreground">
                  {it.term}
                </strong>
                <span className="text-sm text-muted-foreground">
                  · {it.pt}
                </span>
              </div>
              {it.example_en ? (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  &ldquo;{it.example_en}&rdquo;
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <AdvanceButton onClick={onAdvance} isLast={isLast} submitting={submitting} />
      </div>
    );
  }

  if (scene.kind === "grammar_note") {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          💡 {scene.title}
        </h3>
        <p className="text-sm leading-relaxed">{scene.body_en}</p>
        {scene.body_pt ? (
          <p className="text-xs italic text-muted-foreground">{scene.body_pt}</p>
        ) : null}
        {scene.examples && scene.examples.length > 0 ? (
          <ul className="space-y-1 pt-1 text-sm">
            {scene.examples.map((ex, i) => (
              <li key={i}>
                <strong>{ex.en}</strong>
                {ex.pt ? (
                  <span className="text-xs text-muted-foreground"> — {ex.pt}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <AdvanceButton onClick={onAdvance} isLast={isLast} submitting={submitting} />
      </div>
    );
  }

  if (scene.kind === "exercise") {
    const framingChar = scene.framing_character_id
      ? characters[scene.framing_character_id]
      : null;
    return (
      <div className="space-y-3">
        {framingChar ? <CharacterTag char={framingChar} label="Your turn" /> : null}
        <ExerciseInline exercise={scene.exercise} onSolved={onAdvance} />
      </div>
    );
  }

  if (scene.kind === "pronunciation") {
    const framingChar = scene.framing_character_id
      ? characters[scene.framing_character_id]
      : null;
    return (
      <div className="space-y-3">
        {framingChar ? (
          <CharacterTag char={framingChar} label="Say it out loud" />
        ) : null}
        <RecordExercise
          target={scene.target_en}
          targetPt={scene.target_pt}
          onScored={() => {
            // Any attempt counts — we advance on button click after scoring.
          }}
        />
        <AdvanceButton
          onClick={onAdvance}
          isLast={isLast}
          submitting={submitting}
        />
      </div>
    );
  }

  return null;
}

function CharacterTag({
  char,
  label,
}: {
  char: Character;
  label?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: `${char.color}22`,
        color: char.color,
      }}
    >
      <span className="text-base leading-none">{char.emoji}</span>
      <span className="truncate">{char.name}</span>
      {label ? <span className="opacity-60">· {label}</span> : null}
    </div>
  );
}

function CharacterPortrait({ char }: { char: Character }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{
        background: `linear-gradient(135deg, ${char.color}1a, ${char.color}08)`,
        borderColor: `${char.color}44`,
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl shadow-sm"
        style={{ background: `${char.color}22`, color: char.color }}
      >
        {char.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold" style={{ color: char.color }}>
          {char.name}
        </p>
        <p className="text-[11px] text-muted-foreground italic leading-snug">
          {char.one_liner_en}
        </p>
      </div>
    </div>
  );
}

function DialogueBubble({
  char,
  en,
  pt,
}: {
  char: Character | undefined;
  en: string;
  pt?: string;
}) {
  if (!char) {
    return <p className="text-sm">{en}</p>;
  }
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: `${char.color}22`, color: char.color }}
      >
        {char.emoji}
      </div>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p
            className="text-[11px] font-semibold"
            style={{ color: char.color }}
          >
            {char.name}
          </p>
          <SpeakButton text={en} />
        </div>
        <div
          className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-snug"
          style={{ background: `${char.color}14` }}
        >
          {en}
        </div>
        {pt ? (
          <p className="px-1 text-[11px] italic text-muted-foreground">{pt}</p>
        ) : null}
      </div>
    </div>
  );
}

function ExerciseInline({
  exercise,
  onSolved,
}: {
  exercise: {
    id: string;
    type: "multiple_choice" | "fill_blank" | "matching";
    question?: string;
    options?: string[];
    correct?: number | string;
    pairs?: [string, string][];
    explanation?: string;
    hint_pt_br?: string;
  };
  onSolved: () => void;
}) {
  const [state, setState] = useState<"pending" | "correct" | "wrong">("pending");
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<Record<number, number | null>>({});

  // Stable shuffle for matching-right-column — computed once per exercise id
  // so it doesn't reshuffle on every keystroke. Computed unconditionally at
  // the top so React hooks stay consistent between renders.
  const matchingRights = useMemo(() => {
    if (exercise.type !== "matching") return [];
    return (exercise.pairs ?? []).map((p) => p[1]);
  }, [exercise]);
  const shuffledRights = useMemo(() => {
    if (matchingRights.length === 0) return [];
    let seed = 0;
    for (const c of (exercise.id ?? "") + matchingRights.join("|")) {
      seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    }
    const rng = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 0xffffffff);
    const out = [...matchingRights];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [matchingRights, exercise.id]);

  function check() {
    if (exercise.type === "multiple_choice") {
      if (picked === Number(exercise.correct)) setState("correct");
      else setState("wrong");
    } else if (exercise.type === "fill_blank") {
      const target = String(exercise.correct ?? "").trim().toLowerCase();
      if (text.trim().toLowerCase() === target) setState("correct");
      else setState("wrong");
    } else if (exercise.type === "matching") {
      const pairs = exercise.pairs ?? [];
      const allRight = pairs.every((_, i) => matches[i] === i);
      setState(allRight ? "correct" : "wrong");
    }
  }

  if (exercise.type === "multiple_choice") {
    return (
      <div className="space-y-3">
        <p className="text-base font-medium">{exercise.question}</p>
        <div className="grid gap-2">
          {(exercise.options ?? []).map((opt, i) => {
            const isPicked = picked === i;
            const isRight = state !== "pending" && i === Number(exercise.correct);
            const isWrongPick = state === "wrong" && isPicked;
            return (
              <button
                key={i}
                type="button"
                onClick={() => state === "pending" && setPicked(i)}
                disabled={state !== "pending"}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                  isRight
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isWrongPick
                      ? "border-destructive bg-destructive/10"
                      : isPicked
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40"
                }`}
              >
                <span>{opt}</span>
                {isRight ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
              </button>
            );
          })}
        </div>
        <ExerciseFooter
          state={state}
          explanation={exercise.explanation}
          hint={exercise.hint_pt_br}
          onCheck={check}
          onAdvance={onSolved}
          canCheck={picked !== null}
        />
      </div>
    );
  }

  if (exercise.type === "fill_blank") {
    return (
      <div className="space-y-3">
        <p className="text-base font-medium">{exercise.question}</p>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer…"
          disabled={state !== "pending"}
          className="text-base"
        />
        <ExerciseFooter
          state={state}
          explanation={exercise.explanation}
          hint={exercise.hint_pt_br}
          correctAnswer={String(exercise.correct ?? "")}
          onCheck={check}
          onAdvance={onSolved}
          canCheck={text.trim().length > 0}
        />
      </div>
    );
  }

  if (exercise.type === "matching") {
    const pairs = exercise.pairs ?? [];
    const rights = pairs.map((p) => p[1]);
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Match each left item to its right.
        </p>
        <div className="grid gap-2">
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-[42%] rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                {p[0]}
              </span>
              <span className="text-muted-foreground">→</span>
              <select
                value={matches[i] ?? ""}
                onChange={(e) =>
                  setMatches({
                    ...matches,
                    [i]: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                disabled={state !== "pending"}
                className="h-9 flex-1 rounded-lg border bg-background px-2 text-sm text-foreground"
              >
                <option value="" className="bg-background text-foreground">
                  Choose…
                </option>
                {shuffledRights.map((r, j) => (
                  <option
                    key={j}
                    value={rights.indexOf(r)}
                    className="bg-background text-foreground"
                  >
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <ExerciseFooter
          state={state}
          explanation={exercise.explanation}
          hint={exercise.hint_pt_br}
          onCheck={check}
          onAdvance={onSolved}
          canCheck={pairs.every((_, i) => matches[i] != null)}
        />
      </div>
    );
  }

  return null;
}

function ExerciseFooter({
  state,
  explanation,
  hint,
  correctAnswer,
  onCheck,
  onAdvance,
  canCheck,
}: {
  state: "pending" | "correct" | "wrong";
  explanation?: string;
  hint?: string;
  correctAnswer?: string;
  onCheck: () => void;
  onAdvance: () => void;
  canCheck: boolean;
}) {
  if (state === "pending") {
    return (
      <Button onClick={onCheck} disabled={!canCheck} className="w-full">
        Check
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg p-3 text-sm ${
          state === "correct"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        <p className="font-semibold">
          {state === "correct" ? "✓ Correct!" : "Not quite."}
        </p>
        {state === "wrong" && correctAnswer ? (
          <p className="mt-1">
            Answer: <strong>{correctAnswer}</strong>
          </p>
        ) : null}
        {explanation ? <p className="mt-1 opacity-90">{explanation}</p> : null}
        {hint && state === "wrong" ? (
          <p className="mt-1 text-xs italic opacity-80">🇧🇷 {hint}</p>
        ) : null}
      </div>
      <Button onClick={onAdvance} className="w-full">
        Continue <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

function AdvanceButton({
  onClick,
  isLast,
  submitting,
}: {
  onClick: () => void;
  isLast: boolean;
  submitting: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={submitting}
      className="w-full gap-1"
      size="lg"
    >
      {submitting ? "Saving…" : isLast ? "Finish lesson" : "Continue"}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
