import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt } from "lucide-react";
import { YearSelector } from "@/components/reports/year-selector";
import { PdfButton } from "@/components/reports/pdf-button";
import { availableYears } from "@/lib/reports/period";
import { formatBRL } from "@/lib/reports/brl";
import type { PaidInvoiceRow } from "@/lib/actions/reports";

interface StudentReportsCardProps {
  rosterId: string;
  rosterCreatedAt: string | null;
  billingStartsOn: string | null;
  paidInvoices: PaidInvoiceRow[];
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
 * "Documentos" card on the per-student teacher page. Exposes the
 * student curriculum report (with a year selector) plus a list of
 * printable receipts for every month they've paid.
 */
export function StudentReportsCard({
  rosterId,
  rosterCreatedAt,
  billingStartsOn,
  paidInvoices,
}: StudentReportsCardProps) {
  const years = availableYears([
    billingStartsOn,
    rosterCreatedAt,
    ...paidInvoices.map((p) => p.billingMonth),
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Curriculum report */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">Currículo em PDF</p>
            <p className="text-[11px] text-muted-foreground">
              Escolha o período e gere o relatório com o logo da escola.
            </p>
          </div>
          <YearSelector
            years={years}
            buildHref={(y) =>
              `/print/student/${rosterId}/curriculum?year=${y}&autoprint=1`
            }
            label="Baixar currículo"
          />
        </div>

        {/* Receipts list */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Receipt className="h-3.5 w-3.5" />
              Recibos de pagamento
            </p>
            <p className="text-[11px] text-muted-foreground">
              Um recibo formal por mensalidade quitada.
            </p>
          </div>
          {paidInvoices.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
              Nenhuma mensalidade paga até o momento. Marque uma célula
              como paga na matriz para liberar o recibo.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {paidInvoices.map((inv) => (
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
                        ? ` · Pago em ${new Date(inv.paidAt).toLocaleDateString(
                            "pt-BR",
                          )}`
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
      </CardContent>
    </Card>
  );
}
