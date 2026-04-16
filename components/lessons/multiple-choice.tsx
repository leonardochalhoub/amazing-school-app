"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MultipleChoiceProps {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hintPtBr?: string;
  onAnswer: (isCorrect: boolean) => void;
}

export function MultipleChoice({
  question,
  options,
  correctIndex,
  explanation,
  hintPtBr,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const answered = selected !== null;
  const isCorrect = selected === correctIndex;

  function handleSelect(index: number) {
    if (answered) return;
    setSelected(index);
    onAnswer(index === correctIndex);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((option, i) => (
            <Button
              key={i}
              variant="outline"
              className={cn(
                "h-auto py-3 px-4 text-left justify-start transition-all",
                answered && i === correctIndex && "border-green-500 bg-green-50 text-green-700",
                answered && i === selected && i !== correctIndex && "border-red-500 bg-red-50 text-red-700",
                !answered && "hover:border-primary"
              )}
              onClick={() => handleSelect(i)}
              disabled={answered}
            >
              {option}
            </Button>
          ))}
        </div>

        {answered && (
          <div
            className={cn(
              "p-3 rounded-md text-sm",
              isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
            )}
          >
            <p className="font-medium">{isCorrect ? "Correct!" : "Not quite."}</p>
            <p className="mt-1">{explanation}</p>
          </div>
        )}

        {hintPtBr && !answered && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHint ? "Hide hint" : "Dica 🇧🇷"}
          </button>
        )}
        {showHint && !answered && (
          <p className="text-sm text-muted-foreground italic">{hintPtBr}</p>
        )}
      </CardContent>
    </Card>
  );
}
