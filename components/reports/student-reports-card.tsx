import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt } from "lucide-react";
import { YearSelector } from "@/components/reports/year-selector";
import { PdfButton } from "@/components/reports/pdf-button";
import { ReceiptsVisibilityToggle } from "@/components/reports/receipts-visibility-toggle";
import { ShareReceiptToggle } from "@/components/reports/share-receipt-toggle";
import { T } from "@/components/reports/t";
import { availableYears } from "@/lib/reports/period";
import { formatBRL } from "@/lib/reports/brl";
import type { PaidInvoiceRow } from "@/lib/actions/reports";

interface StudentReportsCardProps {
  rosterId: string;
  rosterCreatedAt: string | null;
  billingStartsOn: string | null;
  paidInvoices: PaidInvoiceRow[];
  receiptsVisibleToStudent: boolean;
  /** True when the roster row is linked to an auth.users account.
      Drives the "aluno ainda não acessa a plataforma" warning —
      without an account the Enviar flag goes nowhere and the
      teacher has to hand the PDF over manually. */
  studentHasAccount: boolean;
  studentEmail: string | null;
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return `${MONTHS_PT[m - 1] ?? iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function StudentReportsCard({
  rosterId,
  rosterCreatedAt,
  billingStartsOn,
  paidInvoices,
  receiptsVisibleToStudent,
  studentHasAccount,
  studentEmail,
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
          <T en="Documents" pt="Documentos" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">
              <T en="Curriculum PDF" pt="Currículo em PDF" />
            </p>
            <p className="text-[11px] text-muted-foreground">
              <T
                en="Pick the period and generate the report with the school logo."
                pt="Escolha o período e gere o relatório com o logo da escola."
              />
            </p>
          </div>
          <YearSelector
            years={years}
            hrefTemplate={`/print/student/${rosterId}/curriculum?year={year}&autoprint=1`}
            labelEn="Download curriculum"
            labelPt="Baixar currículo"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Receipt className="h-3.5 w-3.5" />
              <T en="Payment receipts" pt="Recibos de pagamento" />
            </p>
            <p className="text-[11px] text-muted-foreground">
              <T
                en="One formal receipt per paid month."
                pt="Um recibo formal por mensalidade quitada."
              />
            </p>
          </div>
          <ReceiptsVisibilityToggle
            rosterId={rosterId}
            initialVisible={receiptsVisibleToStudent}
          />
          {!studentHasAccount ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
              <T
                en={
                  studentEmail
                    ? "This student hasn't signed up yet — sharing won't reach them online. Download each PDF and send by email, WhatsApp, or print."
                    : "This student has no email on file, so they can't sign in to the platform. Download each PDF and hand it over in person or by the channel you use."
                }
                pt={
                  studentEmail
                    ? "Este aluno ainda não fez login — o envio não chega online. Baixe o PDF e envie por e-mail, WhatsApp ou imprima."
                    : "Este aluno não tem e-mail cadastrado, então não entra na plataforma. Baixe o PDF e entregue pelo canal que você usa."
                }
              />
            </p>
          ) : null}
          {paidInvoices.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
              <T
                en="No paid month yet. Mark a cell as paid in the matrix to unlock the receipt."
                pt="Nenhuma mensalidade paga até o momento. Marque uma célula como paga na matriz para liberar o recibo."
              />
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {paidInvoices.map((inv) => (
                <li
                  key={inv.paymentId}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold capitalize">
                      {monthLabel(inv.billingMonth)}
                    </p>
                    <p className="text-muted-foreground tabular-nums">
                      {formatBRL(inv.amountCents)}
                      {inv.paidAt
                        ? ` · ${new Date(inv.paidAt).toLocaleDateString(
                            "pt-BR",
                          )}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ShareReceiptToggle
                      paymentId={inv.paymentId}
                      initialShared={inv.sharedWithStudent}
                      masterSwitchOn={receiptsVisibleToStudent}
                    />
                    <PdfButton
                      href={`/print/receipt/${inv.paymentId}`}
                      labelEn="Receipt"
                      labelPt="Recibo"
                      variant="subtle"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
