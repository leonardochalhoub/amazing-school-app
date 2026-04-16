"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MatchingProps {
  pairs: [string, string][];
  explanation: string;
  hintPtBr?: string;
  onAnswer: (isCorrect: boolean) => void;
}

export function Matching({
  pairs,
  explanation,
  hintPtBr,
  onAnswer,
}: MatchingProps) {
  const shuffledRight = useMemo(
    () => [...pairs.map((p) => p[1])].sort(() => Math.random() - 0.5),
    [pairs]
  );

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [showHint, setShowHint] = useState(false);

  const allMatched = matched.size === pairs.length;

  function handleLeftClick(index: number) {
    if (matched.has(index) || allMatched) return;
    setSelectedLeft(index);
    setWrongPair(null);
  }

  function handleRightClick(rightIndex: number) {
    if (selectedLeft === null || allMatched) return;

    const correctRight = pairs[selectedLeft][1];
    if (shuffledRight[rightIndex] === correctRight) {
      const newMatched = new Set(matched);
      newMatched.add(selectedLeft);
      setMatched(newMatched);
      setSelectedLeft(null);
      setWrongPair(null);

      if (newMatched.size === pairs.length) {
        onAnswer(true);
      }
    } else {
      setWrongPair([selectedLeft, rightIndex]);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
      }, 800);
    }
  }

  const matchedRightIndices = new Set(
    [...matched].map((leftIdx) =>
      shuffledRight.indexOf(pairs[leftIdx][1])
    )
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Match the pairs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {pairs.map((pair, i) => (
              <Button
                key={`left-${i}`}
                variant="outline"
                className={cn(
                  "w-full h-auto py-2 px-3 text-left text-sm justify-start transition-all",
                  matched.has(i) && "bg-green-50 border-green-500 text-green-700",
                  selectedLeft === i && !matched.has(i) && "border-primary bg-primary/5",
                  wrongPair?.[0] === i && "border-red-500 bg-red-50"
                )}
                onClick={() => handleLeftClick(i)}
                disabled={matched.has(i)}
              >
                {pair[0]}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {shuffledRight.map((text, i) => (
              <Button
                key={`right-${i}`}
                variant="outline"
                className={cn(
                  "w-full h-auto py-2 px-3 text-left text-sm justify-start transition-all",
                  matchedRightIndices.has(i) && "bg-green-50 border-green-500 text-green-700",
                  wrongPair?.[1] === i && "border-red-500 bg-red-50"
                )}
                onClick={() => handleRightClick(i)}
                disabled={matchedRightIndices.has(i)}
              >
                {text}
              </Button>
            ))}
          </div>
        </div>

        {allMatched && (
          <div className="p-3 rounded-md text-sm bg-green-50 text-green-800">
            <p className="font-medium">All matched!</p>
            <p className="mt-1">{explanation}</p>
          </div>
        )}

        {hintPtBr && !allMatched && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHint ? "Hide hint" : "Dica 🇧🇷"}
          </button>
        )}
        {showHint && !allMatched && (
          <p className="text-sm text-muted-foreground italic">{hintPtBr}</p>
        )}
      </CardContent>
    </Card>
  );
}
