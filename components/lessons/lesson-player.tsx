"use client";

import { useState } from "react";
import { MultipleChoice } from "./multiple-choice";
import { FillBlank } from "./fill-blank";
import { Matching } from "./matching";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lesson } from "@/lib/content/loader";

interface LessonPlayerProps {
  lesson: Lesson;
  onComplete: (result: { score: number; total: number; perfect: boolean }) => void;
}

export function LessonPlayer({ lesson, onComplete }: LessonPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const exercise = lesson.exercises[currentIndex];
  const total = lesson.exercises.length;
  const progress = ((currentIndex + (answered ? 1 : 0)) / total) * 100;

  function handleAnswer(isCorrect: boolean) {
    if (isCorrect) setCorrectCount((c) => c + 1);
    setAnswered(true);
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      const finalScore = correctCount + (answered ? 0 : 0);
      setFinished(true);
      onComplete({ score: finalScore, total, perfect: finalScore === total });
      return;
    }
    setCurrentIndex((i) => i + 1);
    setAnswered(false);
  }

  if (finished) {
    const score = correctCount;
    const percentage = Math.round((score / total) * 100);
    return (
      <Card className="max-w-lg mx-auto text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Lesson Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-5xl font-bold">
            {percentage >= 80 ? "🎉" : percentage >= 50 ? "👍" : "💪"}
          </div>
          <p className="text-lg">
            You got <span className="font-bold">{score}/{total}</span> correct
          </p>
          <p className="text-muted-foreground">
            +{lesson.xp_reward} XP earned
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Exercise {currentIndex + 1} of {total}
          </span>
          <span>{correctCount} correct</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {exercise.type === "multiple_choice" && (
        <MultipleChoice
          key={exercise.id}
          question={exercise.question!}
          options={exercise.options!}
          correctIndex={exercise.correct as number}
          explanation={exercise.explanation!}
          hintPtBr={exercise.hint_pt_br}
          onAnswer={handleAnswer}
        />
      )}

      {exercise.type === "fill_blank" && (
        <FillBlank
          key={exercise.id}
          question={exercise.question!}
          correctAnswer={exercise.correct as string}
          explanation={exercise.explanation!}
          hintPtBr={exercise.hint_pt_br}
          onAnswer={handleAnswer}
        />
      )}

      {exercise.type === "matching" && (
        <Matching
          key={exercise.id}
          pairs={exercise.pairs!}
          explanation={exercise.explanation!}
          hintPtBr={exercise.hint_pt_br}
          onAnswer={handleAnswer}
        />
      )}

      {answered && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {currentIndex + 1 >= total ? "See Results" : "Next Exercise"}
          </Button>
        </div>
      )}
    </div>
  );
}
