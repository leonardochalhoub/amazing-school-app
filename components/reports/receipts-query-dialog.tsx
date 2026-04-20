"use client";

import { useMemo, useState } from "react";
import { Search, FileText, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/context";
import { formatBRL } from "@/lib/reports/brl";
import type { TeacherReceiptRow } from "@/lib/actions/reports";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(iso: string, locale: string): string {
  const m = Number(iso.slice(5, 7));
  const arr = locale === "pt-BR" ? MONTHS_PT : MONTHS_EN;
  return `${arr[m - 1] ?? iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

interface Props {
  receipts: TeacherReceiptRow[];
}

export function ReceiptsQueryDialog({ receipts }: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter((r) => {
      const hay = `${r.studentName} ${r.classroomName ?? ""} ${monthLabel(
        r.billingMonth,
        locale,
      )} ${formatBRL(r.amountCents)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [receipts, query, locale]);

  function exportAll() {
    if (filtered.length === 0) return;
    // Chrome/Safari allow multi-tab window.open when the call chain
    // is synchronous inside the user click handler; 10+ tabs may
    // still trigger the popup guard. Warn first for larger batches.
    if (filtered.length > 10) {
      const ok = confirm(
        locale === "pt-BR"
          ? `Abrir ${filtered.length} abas (uma por recibo)? Seu navegador pode pedir permissão de pop-ups.`
          : `Open ${filtered.length} tabs (one per receipt)? Your browser may ask to allow pop-ups.`,
      );
      if (!ok) return;
    }
    for (const r of filtered) {
      window.open(
        `/print/receipt/${r.paymentId}?autoprint=1`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <FileText className="h-3.5 w-3.5" />
        {locale === "pt-BR" ? "Consultar recibos" : "Browse receipts"}
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {receipts.length}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>
              {locale === "pt-BR" ? "Recibos emitidos" : "Issued receipts"}
            </DialogTitle>
            <DialogDescription>
              {locale === "pt-BR"
                ? "Todos os pagamentos marcados como Pago, do mais recente ao mais antigo. Use o filtro para encontrar um aluno ou mês específico."
                : "Every payment marked as paid, newest first. Use the filter to find a specific student or month."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    locale === "pt-BR"
                      ? "Filtrar por aluno, turma, mês, valor…"
                      : "Filter by student, classroom, month, amount…"
                  }
                  className="h-9 pl-8"
                />
              </div>
              <button
                type="button"
                onClick={exportAll}
                disabled={filtered.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {locale === "pt-BR"
                  ? filtered.length > 1
                    ? `Baixar ${filtered.length} PDFs`
                    : "Baixar PDF"
                  : filtered.length > 1
                    ? `Download ${filtered.length} PDFs`
                    : "Download PDF"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {locale === "pt-BR"
                ? `${filtered.length} de ${receipts.length} recibos`
                : `${filtered.length} of ${receipts.length} receipts`}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto border-t border-border">
            {filtered.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {locale === "pt-BR"
                  ? "Nenhum recibo encontrado para o filtro."
                  : "No receipts match that filter."}
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 sticky top-0 bg-muted/60 backdrop-blur">
                      {locale === "pt-BR" ? "Aluno" : "Student"}
                    </th>
                    <th className="px-4 py-2 sticky top-0 bg-muted/60 backdrop-blur">
                      {locale === "pt-BR" ? "Mês" : "Month"}
                    </th>
                    <th className="px-4 py-2 sticky top-0 bg-muted/60 backdrop-blur text-right">
                      {locale === "pt-BR" ? "Valor" : "Amount"}
                    </th>
                    <th className="px-4 py-2 sticky top-0 bg-muted/60 backdrop-blur">
                      {locale === "pt-BR" ? "Pago em" : "Paid on"}
                    </th>
                    <th className="px-4 py-2 sticky top-0 bg-muted/60 backdrop-blur" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.paymentId}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-2 font-medium">
                        {r.studentName}
                        {r.classroomName ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            · {r.classroomName}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 capitalize">
                        {monthLabel(r.billingMonth, locale)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatBRL(r.amountCents)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {r.paidAt
                          ? new Date(r.paidAt).toLocaleDateString(
                              locale === "pt-BR" ? "pt-BR" : "en-US",
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <a
                          href={`/print/receipt/${r.paymentId}?autoprint=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
                        >
                          <Printer className="h-3 w-3" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
