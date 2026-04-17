"use client";

import { useState } from "react";
import { Lightbulb, ArrowRight, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/lib/content/schema";

interface Props {
  lesson: Lesson;
}

export function LessonPreviewPlayer({ lesson }: Props) {
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const exercise = lesson.exercises[idx];
  const total = lesson.exercises.length;
  const progress = Math.round(((idx + (showAnswer ? 1 : 0)) / total) * 100);
  const done = idx >= total;

  function next() {
    setShowAnswer(false);
    setShowHint(false);
    setIdx((i) => i + 1);
  }

  function reset() {
    setIdx(0);
    setShowAnswer(false);
    setShowHint(false);
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-lg font-semibold">End of preview</p>
          <p className="text-sm text-muted-foreground">
            You walked through all {total} exercises.
          </p>
          <Button variant="outline" onClick={reset} className="mt-2 gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Exercise {idx + 1} of {total}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {exercise.type.replace("_", " ")}
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              {exercise.id}
            </span>
          </div>

          {"question" in exercise ? (
            <p className="text-lg font-medium">{exercise.question}</p>
          ) : null}

          {exercise.type === "multiple_choice" ? (
            <div className="grid gap-2">
              {exercise.options.map((opt, i) => {
                const correct = showAnswer && i === exercise.correct;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={showAnswer}
                    onClick={() => setShowAnswer(true)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      correct
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border hover:border-foreground/30 hover:bg-accent"
                    }`}
                  >
                    <span>{opt}</span>
                    {correct ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {exercise.type === "fill_blank" ? (
            <div className="space-y-2">
              {showAnswer ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Correct answer
                  </span>
                  <p className="mt-1 font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {exercise.correct}
                  </p>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowAnswer(true)}>
                  Reveal answer
                </Button>
              )}
            </div>
          ) : null}

          {exercise.type === "matching" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {exercise.pairs.map(([en, pt], i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <span className="flex-1 font-medium">{en}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">{pt}</span>
                </div>
              ))}
            </div>
          ) : null}

          {!showHint ? (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Show PT-BR hint
            </button>
          ) : (
            <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">🇧🇷 Dica</p>
              <p className="mt-1">{exercise.hint_pt_br}</p>
            </div>
          )}

          {showAnswer ? (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="font-semibold">Explanation</p>
              <p className="mt-1 text-muted-foreground">
                {exercise.explanation}
              </p>
            </div>
          ) : null}

          {showAnswer ? (
            <div className="flex justify-end">
              <Button onClick={next} className="gap-1.5">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
