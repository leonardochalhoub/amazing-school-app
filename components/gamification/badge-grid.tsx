"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BadgeDefinition } from "@/lib/gamification/config";

interface BadgeGridProps {
  earnedBadges: string[];
  allBadges: readonly BadgeDefinition[];
}

export function BadgeGrid({ earnedBadges, allBadges }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {allBadges.map((badge) => {
        const earned = earnedBadges.includes(badge.type);
        return (
          <Card
            key={badge.type}
            className={cn(
              "transition-all",
              earned
                ? "border-primary/30 bg-primary/5"
                : "opacity-50 grayscale"
            )}
          >
            <CardContent className="p-3 text-center space-y-1">
              <div className="text-2xl">{earned ? badge.icon : "🔒"}</div>
              <p className="text-xs font-medium truncate">{badge.name}</p>
              {earned && (
                <p className="text-[10px] text-muted-foreground">
                  {badge.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
