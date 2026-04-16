"use client";

import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streakDays: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm gap-1",
  md: "text-base gap-1.5",
  lg: "text-xl gap-2",
};

const iconSizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function StreakCounter({ streakDays, size = "md" }: StreakCounterProps) {
  const active = streakDays > 0;

  return (
    <div className={cn("flex items-center", sizeClasses[size])}>
      <span
        className={cn(
          iconSizes[size],
          active && "animate-pulse"
        )}
      >
        {active ? "🔥" : "❄️"}
      </span>
      <div>
        <span className="font-bold">{streakDays}</span>
        <span className="text-muted-foreground ml-1">
          {streakDays === 1 ? "day" : "days"}
        </span>
        {!active && (
          <p className="text-xs text-muted-foreground">Start a streak!</p>
        )}
      </div>
    </div>
  );
}
