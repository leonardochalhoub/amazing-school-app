"use client";

import { Zap } from "lucide-react";
import { getXpForNextLevel } from "@/lib/gamification/engine";

interface XpBarProps {
  currentXp: number;
  level: number;
}

export function XpBar({ currentXp, level }: XpBarProps) {
  const { current, needed, progress } = getXpForNextLevel(currentXp);
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span className="inline-flex items-center gap-1 font-semibold">
          <Zap className="h-3 w-3 text-amber-500" />
          Level {level}
        </span>
        <span className="text-muted-foreground">
          {current} / {needed} XP
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-[width] duration-700"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
