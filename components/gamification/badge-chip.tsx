"use client";

import { BADGE_BY_TYPE } from "@/lib/gamification/config";
import { translateBadge } from "@/lib/gamification/badge-i18n";
import { badgeFlavor } from "@/lib/gamification/badge-flavors";
import { useI18n } from "@/lib/i18n/context";

/**
 * Compact gradient badge chip used in the student hero. Picks up its
 * name/description from the locale stored in `useI18n()` so toggling
 * the language live re-renders every chip on screen.
 *
 * Hover text prefers the evocative flavor copy from badge-flavors.ts
 * (e.g. "The Watch never ends." for the_wall); falls back to the
 * "Name · Description" pair when a type has no custom flavor yet.
 */
export function BadgeChip({ type }: { type: string }) {
  const { locale } = useI18n();
  const def = BADGE_BY_TYPE[type];
  if (!def) return null;
  const text = translateBadge(type, locale, {
    name: def.name,
    description: def.description,
  });
  const flavor = badgeFlavor(type, locale);
  const hover = flavor
    ? `${text.name} — ${flavor}`
    : `${text.name} · ${text.description}`;
  return (
    <span
      title={hover}
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br ${def.gradient} ${def.glow} px-2.5 py-0.5 text-[11px] font-semibold text-white`}
    >
      <span aria-hidden>{def.icon}</span>
      {text.name}
    </span>
  );
}
