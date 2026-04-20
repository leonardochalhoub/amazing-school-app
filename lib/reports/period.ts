/**
 * Shared year-scoping helpers used by every report that offers a
 * year selector. Years are capped by the platform's earliest
 * recorded activity on one side and "current year + 1" on the
 * other so the selector never offers a dead year.
 */

export type Year = number | "all";

export function isYear(raw: string | number | undefined): raw is Year {
  if (raw === "all") return true;
  const n = typeof raw === "string" ? Number(raw) : raw ?? NaN;
  return Number.isInteger(n) && n >= 2020 && n <= new Date().getFullYear() + 1;
}

export function parseYear(raw: string | string[] | undefined): Year {
  if (!raw) return new Date().getFullYear();
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (val === "all") return "all";
  const n = Number(val);
  if (isYear(n)) return n;
  return new Date().getFullYear();
}

export function yearBounds(year: Year): { from: Date; to: Date } {
  if (year === "all") {
    return { from: new Date(2020, 0, 1), to: new Date(2100, 0, 1) };
  }
  return {
    from: new Date(year, 0, 1),
    to: new Date(year + 1, 0, 1),
  };
}

export function yearLabel(year: Year, locale = "pt-BR"): string {
  if (year === "all") {
    return locale === "pt-BR" ? "Todo o histórico" : "All time";
  }
  return String(year);
}

/**
 * Build a list of years to offer in the selector. We start from the
 * earliest timestamp provided (usually the student's enrollment or
 * the first lesson_progress record) and go through the current year.
 * Callers pass a seed list of ISO timestamps — we pick the oldest
 * year that actually has data.
 */
export function availableYears(seedIsoDates: Array<string | null | undefined>): number[] {
  const now = new Date().getFullYear();
  let earliest = now;
  for (const raw of seedIsoDates) {
    if (!raw) continue;
    const y = new Date(raw).getFullYear();
    if (Number.isFinite(y) && y >= 2020 && y < earliest) earliest = y;
  }
  const years: number[] = [];
  for (let y = earliest; y <= now; y++) years.push(y);
  return years;
}
