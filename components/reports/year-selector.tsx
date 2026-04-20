"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearSelectorProps {
  /** Years to offer — usually seeded from the data's earliest timestamp. */
  years: number[];
  /** Currently-selected year (undefined → default to latest). */
  initial?: number | "all";
  /** Called with the URL to open in a new tab. Implementer builds
      the URL using the chosen year so the print page picks it up. */
  buildHref: (year: number | "all") => string;
  /** Button label (usually "Baixar PDF" / "Download PDF"). */
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
  buildHref,
  label = "Baixar PDF",
  includeAll = true,
  className,
}: YearSelectorProps) {
  const latest = years[years.length - 1] ?? new Date().getFullYear();
  const [year, setYear] = useState<number | "all">(initial ?? latest);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        role="tablist"
        aria-label="Período"
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
            Tudo
          </button>
        ) : null}
      </div>
      <a
        href={buildHref(year)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <Printer className="h-3.5 w-3.5" />
        {label}
      </a>
    </div>
  );
}
