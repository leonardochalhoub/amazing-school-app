import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "emerald" | "amber" | "rose" | "indigo" | "sky" | "violet" | "default";

interface Props {
  label: string;
  value: string | number;
  /** Optional secondary explainer. Kept short — one phrase. */
  sub?: string;
  icon?: React.ReactNode;
  /** Full human value, surfaced via title= for truncated compact numbers. */
  fullValue?: string;
  tone?: Tone;
  /** Subtle trend indicator: +/- percent or plain label. */
  trend?: string;
  trendTone?: "up" | "down" | "flat";
}

/**
 * Compact KPI tile used across the teacher Management dashboard. Values
 * are expected to already be formatted (use `compactBRL` for money and
 * `compactNumber` for large counts). Keeps layout stable across widths by
 * capping the hero text to 3xl, then truncating with ellipsis + full
 * value in the tooltip — so "R$ 94,4k" never gets cut mid-number.
 */
export function KpiTile({
  label,
  value,
  sub,
  icon,
  fullValue,
  tone = "default",
  trend,
  trendTone = "flat",
}: Props) {
  const toneText =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : tone === "indigo"
            ? "text-indigo-600 dark:text-indigo-400"
            : tone === "sky"
              ? "text-sky-600 dark:text-sky-400"
              : tone === "violet"
                ? "text-violet-600 dark:text-violet-400"
                : "";
  const accentBg =
    tone === "emerald"
      ? "bg-emerald-500/10"
      : tone === "amber"
        ? "bg-amber-500/10"
        : tone === "rose"
          ? "bg-rose-500/10"
          : tone === "indigo"
            ? "bg-indigo-500/10"
            : tone === "sky"
              ? "bg-sky-500/10"
              : tone === "violet"
                ? "bg-violet-500/10"
                : "bg-muted/40";
  const trendColor =
    trendTone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trendTone === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "flex-1 text-[10px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground",
              toneText,
            )}
          >
            {label}
          </p>
          {icon ? (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                accentBg,
                toneText,
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <p
          title={fullValue ?? String(value)}
          className={cn(
            "truncate text-2xl font-semibold tabular-nums leading-tight",
            toneText,
          )}
        >
          {value}
        </p>
        <div className="mt-auto space-y-0.5">
          {sub ? (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {sub}
            </p>
          ) : null}
          {trend ? (
            <p className={cn("text-[10px] font-medium", trendColor)}>
              {trend}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Format BRL cents for KPI tiles. Full format up to R$ 9.999,99; compact
 * (k / M suffix) above so the hero never overflows a compact card.
 */
export function compactBRL(cents: number): string {
  const reais = cents / 100;
  if (!Number.isFinite(reais)) return "R$ 0";
  const abs = Math.abs(reais);
  if (abs < 10_000) {
    return reais.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (abs < 1_000_000) {
    const k = reais / 1000;
    return `R$ ${k.toLocaleString("pt-BR", {
      minimumFractionDigits: abs < 100_000 ? 1 : 0,
      maximumFractionDigits: abs < 100_000 ? 1 : 0,
    })}k`;
  }
  const m = reais / 1_000_000;
  return `R$ ${m.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}M`;
}

/** Full BRL format — for titles/tooltips and detail pages. */
export function fullBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs < 10_000) return n.toLocaleString("pt-BR");
  if (abs < 1_000_000)
    return `${(n / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: abs < 100_000 ? 1 : 0,
      maximumFractionDigits: abs < 100_000 ? 1 : 0,
    })}k`;
  return `${(n / 1_000_000).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}M`;
}
