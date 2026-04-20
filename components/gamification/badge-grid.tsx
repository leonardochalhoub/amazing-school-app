"use client";

import { cn } from "@/lib/utils";
import type { BadgeDefinition } from "@/lib/gamification/config";
import {
  translateBadge,
  translateRarity,
} from "@/lib/gamification/badge-i18n";
import { useI18n } from "@/lib/i18n/context";

interface BadgeGridProps {
  earnedBadges: string[];
  allBadges: readonly BadgeDefinition[];
}

export function BadgeGrid({ earnedBadges, allBadges }: BadgeGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {allBadges.map((badge) => {
        const earned = earnedBadges.includes(badge.type);
        return (
          <BadgeTile key={badge.type} badge={badge} earned={earned} />
        );
      })}
    </div>
  );
}

function BadgeTile({
  badge,
  earned,
}: {
  badge: BadgeDefinition;
  earned: boolean;
}) {
  const { locale } = useI18n();
  const text = translateBadge(badge.type, locale, {
    name: badge.name,
    description: badge.description,
  });
  const rarityLabel = translateRarity(badge.rarity, locale);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-3 transition-all",
        earned
          ? `border-border bg-gradient-to-br ${badge.gradient} text-white ${badge.glow} hover:-translate-y-0.5`
          : "border-dashed border-border bg-muted/30 text-muted-foreground",
      )}
    >
      {/* Hexagonal sheen */}
      {earned ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.25),transparent_60%)] opacity-80"
        />
      ) : null}

      <div className="relative flex flex-col items-center gap-1.5 text-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
            earned
              ? "bg-white/20 ring-2 ring-white/40 backdrop-blur"
              : "bg-muted grayscale",
          )}
        >
          {earned ? badge.icon : "🔒"}
        </div>
        <p className={cn("truncate text-xs font-semibold", !earned && "opacity-70")}>
          {text.name}
        </p>
        <p
          className={cn(
            "line-clamp-2 text-[10px]",
            earned ? "text-white/80" : "text-muted-foreground/80",
          )}
        >
          {text.description}
        </p>
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            earned
              ? "border-white/40 bg-white/15 text-white"
              : "border-border bg-background/60",
          )}
        >
          {rarityLabel}
        </span>
      </div>
    </div>
  );
}
