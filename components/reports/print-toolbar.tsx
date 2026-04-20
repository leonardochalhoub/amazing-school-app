"use client";

import { Printer, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

/**
 * Floating toolbar shown on /print/* screens BEFORE the print
 * dialog fires. `.no-print` so it disappears from the generated PDF.
 */
export function PrintToolbar({ filename }: { filename: string }) {
  const { locale } = useI18n();
  return (
    <div className="no-print sticky top-4 z-50 mx-auto mb-4 flex max-w-[794px] items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <p className="truncate text-xs text-slate-600">
        <span className="font-medium text-slate-900">
          {locale === "pt-BR" ? "Prévia:" : "Preview:"}
        </span>{" "}
        <span className="font-mono">{filename}.pdf</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          <Printer className="h-3.5 w-3.5" />
          {locale === "pt-BR"
            ? "Imprimir / Salvar em PDF"
            : "Print / Save as PDF"}
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {locale === "pt-BR" ? "Fechar" : "Close"}
        </button>
      </div>
      <Download className="hidden" aria-hidden />
    </div>
  );
}
