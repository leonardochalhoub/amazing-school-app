"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

interface YearSelectorProps {
  /** Years to offer — usually seeded from the data's earliest timestamp. */
  years: number[];
  /** Currently-selected year (undefined → default to latest). */
  initial?: number | "all";
  /** URL template containing `{year}` which will be substituted with
      the chosen year. A template string is used instead of a closure
      because React Server Components cannot pass plain functions
      across to client components. */
  hrefTemplate: string;
  /** Button label — pass both locales; the active one is picked
      via `useI18n()`. Legacy `label` still works for PT-only uses. */
  labelEn?: string;
  labelPt?: string;
  label?: string;
  /** Whether to include an "All time" option. Default true. */
  includeAll?: boolean;
  className?: string;
}

/** LocalStorage key for user-added years (past or future). Shared by
 *  both student and teacher curriculum selectors so a teacher who
 *  adds 2027 once sees it on every report selector until they clear
 *  it. Values are sorted + de-duped against the server-seeded years. */
const CUSTOM_YEARS_STORAGE_KEY = "curriculum.customYears.v1";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function readCustomYears(): number[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_YEARS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is number =>
        typeof v === "number" && v >= MIN_YEAR && v <= MAX_YEAR,
    );
  } catch {
    return [];
  }
}

function writeCustomYears(list: number[]) {
  try {
    const cleaned = Array.from(new Set(list))
      .filter((v) => v >= MIN_YEAR && v <= MAX_YEAR)
      .sort((a, b) => a - b);
    window.localStorage.setItem(
      CUSTOM_YEARS_STORAGE_KEY,
      JSON.stringify(cleaned),
    );
  } catch {
    /* quota exceeded / private mode — best effort only */
  }
}

/**
 * Inline year selector + "download" trigger used on dashboard pages.
 * Choosing a year updates local state; the button opens the print
 * route in a new tab with `?autoprint=1` so the PDF dialog fires
 * immediately.
 *
 * The "+" button at the end lets the viewer type any year they want
 * (past or future) into the list. Custom picks are persisted in
 * localStorage and get merged + sorted with the server-seeded
 * years, so adding 2027 once keeps it visible on every visit.
 */
export function YearSelector({
  years,
  initial,
  hrefTemplate,
  label,
  labelEn,
  labelPt,
  includeAll = true,
  className,
}: YearSelectorProps) {
  const { locale } = useI18n();
  const [customYears, setCustomYears] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [draftYear, setDraftYear] = useState<string>("");

  // Hydrate custom years from localStorage after mount so SSR output
  // doesn't diverge from the first client render (stays [] on SSR
  // and merges in on the second render).
  useEffect(() => {
    setCustomYears(readCustomYears());
  }, []);

  const mergedYears = useMemo(() => {
    const merged = new Set<number>();
    for (const y of years) merged.add(y);
    for (const y of customYears) merged.add(y);
    return Array.from(merged).sort((a, b) => a - b);
  }, [years, customYears]);

  const latest =
    mergedYears[mergedYears.length - 1] ?? new Date().getFullYear();
  const [year, setYear] = useState<number | "all">(initial ?? latest);

  const resolvedLabel =
    (locale === "pt-BR" ? labelPt : labelEn) ??
    label ??
    (locale === "pt-BR" ? "Baixar PDF" : "Download PDF");

  function commitAdd() {
    const n = Number(draftYear);
    if (!Number.isFinite(n) || n < MIN_YEAR || n > MAX_YEAR) {
      setAdding(false);
      setDraftYear("");
      return;
    }
    const rounded = Math.round(n);
    const next = Array.from(new Set([...customYears, rounded])).sort(
      (a, b) => a - b,
    );
    setCustomYears(next);
    writeCustomYears(next);
    setYear(rounded);
    setAdding(false);
    setDraftYear("");
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        role="tablist"
        aria-label={locale === "pt-BR" ? "Período" : "Period"}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5"
      >
        {mergedYears.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={year === y}
            onClick={() => setYear(y)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
              year === y
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {y}
          </button>
        ))}
        {includeAll ? (
          <button
            type="button"
            role="tab"
            aria-selected={year === "all"}
            onClick={() => setYear("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              year === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {locale === "pt-BR" ? "Tudo" : "All time"}
          </button>
        ) : null}

        {/* "+" add-custom-year control. Clicking it reveals a tiny
            4-digit input; Enter commits, Escape cancels, blur also
            commits. The added year is persisted to localStorage. */}
        {adding ? (
          <input
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            autoFocus
            value={draftYear}
            onChange={(e) => setDraftYear(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAdd();
              if (e.key === "Escape") {
                setAdding(false);
                setDraftYear("");
              }
            }}
            onBlur={commitAdd}
            placeholder={String(new Date().getFullYear())}
            className="w-[4.25rem] rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={locale === "pt-BR" ? "Novo ano" : "New year"}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            title={locale === "pt-BR" ? "Adicionar ano" : "Add year"}
            aria-label={locale === "pt-BR" ? "Adicionar ano" : "Add year"}
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <a
        href={hrefTemplate.replaceAll("{year}", String(year))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <Printer className="h-3.5 w-3.5" />
        {resolvedLabel}
      </a>
    </div>
  );
}
