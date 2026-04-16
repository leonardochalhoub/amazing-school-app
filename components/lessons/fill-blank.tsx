"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FillBlankProps {
  question: string;
  correctAnswer: string;
  explanation: string;
  hintPtBr?: string;
  onAnswer: (isCorrect: boolean) => void;
}

export function FillBlank({
  question,
  correctAnswer,
  explanation,
  hintPtBr,
  onAnswer,
}: FillBlankProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isCorrect =
    value.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  function handleSubmit() {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    onAnswer(isCorrect);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type your answer..."
            disabled={submitted}
            className={cn(
              submitted && isCorrect && "border-green-500",
              submitted && !isCorrect && "border-red-500"
            )}
          />
          {!submitted && (
            <Button onClick={handleSubmit} disabled={!value.trim()}>
              Check
            </Button>
          )}
        </div>

        {submitted && (
          <div
            className={cn(
              "p-3 rounded-md text-sm",
              isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
            )}
          >
            <p className="font-medium">
              {isCorrect ? "Correct!" : `The answer is: "${correctAnswer}"`}
            </p>
            <p className="mt-1">{explanation}</p>
          </div>
        )}

        {hintPtBr && !submitted && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHint ? "Hide hint" : "Dica 🇧🇷"}
          </button>
        )}
        {showHint && !submitted && (
          <p className="text-sm text-muted-foreground italic">{hintPtBr}</p>
        )}
      </CardContent>
    </Card>
  );
}
