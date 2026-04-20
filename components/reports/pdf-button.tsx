"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

interface PdfButtonProps {
  href: string;
  label?: string;
  labelEn?: string;
  labelPt?: string;
  variant?: "default" | "subtle";
  className?: string;
}

export function PdfButton({
  href,
  label,
  labelEn,
  labelPt,
  variant = "default",
  className,
}: PdfButtonProps) {
  const { locale } = useI18n();
  const resolvedLabel =
    (locale === "pt-BR" ? labelPt : labelEn) ??
    label ??
    (locale === "pt-BR" ? "Baixar PDF" : "Download PDF");
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
      {resolvedLabel}
    </a>
  );
}
