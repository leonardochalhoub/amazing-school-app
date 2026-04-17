import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiAccent = "indigo" | "emerald" | "amber" | "pink" | "sky";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accent?: KpiAccent;
}

const ACCENTS: Record<
  KpiAccent,
  { bg: string; fg: string; ring: string }
> = {
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    fg: "text-indigo-600 dark:text-indigo-300",
    ring: "ring-indigo-100 dark:ring-indigo-900/60",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    fg: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-100 dark:ring-emerald-900/60",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    fg: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-100 dark:ring-amber-900/60",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    fg: "text-pink-600 dark:text-pink-300",
    ring: "ring-pink-100 dark:ring-pink-900/60",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    fg: "text-sky-600 dark:text-sky-300",
    ring: "ring-sky-100 dark:ring-sky-900/60",
  },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = "indigo",
}: KpiCardProps) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-foreground/15">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md ring-1",
            a.bg,
            a.fg,
            a.ring
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        {sub ? (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}
