import { Printer, Receipt } from "lucide-react";
import { IssueServiceReceiptButton } from "@/components/reports/issue-service-receipt-button";
import { DeleteServiceReceiptButton } from "@/components/reports/delete-service-receipt-button";
import { T } from "@/components/reports/t";
import { formatBRL } from "@/lib/reports/brl";
import type { ServiceReceiptRecord } from "@/lib/actions/service-receipts";

interface Props {
  receipts: ServiceReceiptRecord[];
  students: Array<{ id: string; fullName: string }>;
}

const TOP = 5;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Inline section on /teacher/admin for ad-hoc service receipts.
 * Lives next to the tuition-receipt query dialog — both are
 * "receipts" but different shapes. Shows the 5 most recent service
 * receipts and a button to emit a new one.
 */
export function ServiceReceiptsSection({ receipts, students }: Props) {
  const top = receipts.slice(0, TOP);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Receipt className="h-3.5 w-3.5" />
          <T en="Service receipts" pt="Recibos avulsos" />
          {receipts.length > 0 ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {receipts.length}
            </span>
          ) : null}
        </h2>
        <IssueServiceReceiptButton students={students} />
      </div>

      {receipts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          <T
            en="No service receipts yet. Click Issue service receipt for anything outside the monthly tuition — consulting, translation, extra classes."
            pt="Nenhum recibo avulso emitido. Clique em Emitir recibo avulso para serviços fora da mensalidade — consultoria, tradução, aulas extras."
          />
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {top.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 px-3 py-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {r.clientName}
                  <span className="ml-2 text-[10.5px] font-normal text-muted-foreground tabular-nums">
                    {r.receiptNumber}
                  </span>
                </p>
                <p className="truncate text-muted-foreground">
                  {r.description}
                </p>
                <p className="text-[10.5px] text-muted-foreground tabular-nums">
                  <T en="Issued" pt="Emitido" />: {fmtDate(r.issuedOn)} ·{" "}
                  <span className="font-semibold">
                    {formatBRL(r.amountCents)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/print/service-receipt/${r.id}?autoprint=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
                >
                  <Printer className="h-3 w-3" />
                  PDF
                </a>
                <DeleteServiceReceiptButton id={r.id} />
              </div>
            </li>
          ))}
          {receipts.length > TOP ? (
            <li className="px-3 py-2 text-center text-[11px] text-muted-foreground">
              <T
                en={`+ ${receipts.length - TOP} more · expand list coming soon`}
                pt={`+ ${receipts.length - TOP} mais · lista expandida em breve`}
              />
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
