"use client";

import { Progress } from "@/components/ui/progress";
import { getXpForNextLevel } from "@/lib/gamification/engine";

interface XpBarProps {
  currentXp: number;
  level: number;
}

export function XpBar({ currentXp, level }: XpBarProps) {
  const { current, needed, progress } = getXpForNextLevel(currentXp);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Level {level}</span>
        <span className="text-muted-foreground">
          {current}/{needed} XP
        </span>
      </div>
      <Progress value={progress} className="h-2.5" />
    </div>
  );
}
