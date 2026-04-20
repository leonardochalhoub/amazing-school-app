import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt } from "lucide-react";
import { YearSelector } from "@/components/reports/year-selector";
import { PdfButton } from "@/components/reports/pdf-button";
import { availableYears } from "@/lib/reports/period";
import { formatBRL } from "@/lib/reports/brl";
import type { PaidInvoiceRow } from "@/lib/actions/reports";

interface Props {
  rosterId: string;
  rosterCreatedAt: string | null;
  billingStartsOn: string | null;
  receiptsVisible: boolean;
  receipts: PaidInvoiceRow[];
}

const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function monthLabel(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return `${MONTHS_PT[m - 1] ?? iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Student-side analogue of the teacher's Documentos card. Every
 * student can download their own curriculum by year; receipts show
 * up only when the teacher has flipped the per-student visibility
 * toggle.
 */
export function MyDocumentsCard({
  rosterId,
  rosterCreatedAt,
  billingStartsOn,
  receiptsVisible,
  receipts,
}: Props) {
  const years = availableYears([
    billingStartsOn,
    rosterCreatedAt,
    ...receipts.map((r) => r.billingMonth),
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Meus documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">Meu currículo em PDF</p>
            <p className="text-[11px] text-muted-foreground">
              Conteúdos atribuídos e concluídos no período.
            </p>
          </div>
          <YearSelector
            years={years}
            hrefTemplate={`/print/student/${rosterId}/curriculum?year={year}&autoprint=1`}
            label="Baixar currículo"
          />
        </div>

        {receiptsVisible ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Receipt className="h-3.5 w-3.5" />
                Meus recibos
              </p>
              <p className="text-[11px] text-muted-foreground">
                Um recibo por mensalidade paga.
              </p>
            </div>
            {receipts.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                Ainda não há recibos disponíveis.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {receipts.map((inv) => (
                  <li
                    key={inv.paymentId}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold capitalize">
                        {monthLabel(inv.billingMonth)}
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        {formatBRL(inv.amountCents)}
                        {inv.paidAt
                          ? ` · Pago em ${new Date(
                              inv.paidAt,
                            ).toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    </div>
                    <PdfButton
                      href={`/print/receipt/${inv.paymentId}`}
                      label="Recibo"
                      variant="subtle"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
