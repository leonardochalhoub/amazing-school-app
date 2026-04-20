"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfButtonProps {
  href: string;
  label?: string;
  variant?: "default" | "subtle";
  className?: string;
}

/**
 * Thin client-side button that opens a /print/* route in a new tab
 * with `autoprint=1` so the browser print dialog fires immediately.
 * Use on dashboard pages where no period/year selector is needed.
 */
export function PdfButton({
  href,
  label = "Baixar PDF",
  variant = "default",
  className,
}: PdfButtonProps) {
  const withAutoprint = href.includes("?")
    ? `${href}&autoprint=1`
    : `${href}?autoprint=1`;
  return (
    <a
      href={withAutoprint}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors",
        variant === "default"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
