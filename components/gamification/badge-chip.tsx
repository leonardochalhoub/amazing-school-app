"use client";

import { BADGE_BY_TYPE } from "@/lib/gamification/config";
import { translateBadge } from "@/lib/gamification/badge-i18n";
import { useI18n } from "@/lib/i18n/context";

/**
 * Compact gradient badge chip used in the student hero. Picks up its
 * name/description from the locale stored in `useI18n()` so toggling the
 * language live re-renders every chip on screen.
 */
export function BadgeChip({ type }: { type: string }) {
  const { locale } = useI18n();
  const def = BADGE_BY_TYPE[type];
  if (!def) return null;
  const text = translateBadge(type, locale, {
    name: def.name,
    description: def.description,
  });
  return (
    <span
      title={`${text.name} · ${text.description}`}
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br ${def.gradient} ${def.glow} px-2.5 py-0.5 text-[11px] font-semibold text-white`}
    >
      <span aria-hidden>{def.icon}</span>
      {text.name}
    </span>
  );
}
