"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";

/**
 * Tiny inline translator used across the reports UI so server
 * components can drop bilingual labels without turning client.
 * Reports themselves stay in Portuguese (formal documents), only
 * the *site chrome* around them follows the locale toggle. Accepts
 * ReactNode so callers can inline <strong>, etc.
 */
export function T({ en, pt }: { en: ReactNode; pt: ReactNode }) {
  const { locale } = useI18n();
  return <>{locale === "pt-BR" ? pt : en}</>;
}

/** Hook flavour for prop-level strings (placeholders, aria, alt). */
export function useReportsLocale(): "en" | "pt-BR" {
  const { locale } = useI18n();
  return locale;
}

export function pick<T>(locale: "en" | "pt-BR", en: T, pt: T): T {
  return locale === "pt-BR" ? pt : en;
}
