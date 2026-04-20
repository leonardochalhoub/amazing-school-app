"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
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

/**
 * Inline year selector + "download" trigger used on dashboard pages.
 * Choosing a year updates local state; the button opens the print
 * route in a new tab with `?autoprint=1` so the PDF dialog fires
 * immediately.
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
  const latest = years[years.length - 1] ?? new Date().getFullYear();
  const [year, setYear] = useState<number | "all">(initial ?? latest);

  const resolvedLabel =
    (locale === "pt-BR" ? labelPt : labelEn) ??
    label ??
    (locale === "pt-BR" ? "Baixar PDF" : "Download PDF");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        role="tablist"
        aria-label={locale === "pt-BR" ? "Período" : "Period"}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5"
      >
        {years.map((y) => (
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
