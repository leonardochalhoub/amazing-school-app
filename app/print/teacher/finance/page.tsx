import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFinanceReport } from "@/lib/actions/reports";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { formatBRL } from "@/lib/reports/brl";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    year?: string | string[];
    autoprint?: string | string[];
  }>;
}

function parseFinanceYear(raw: string | string[] | undefined): number {
  if (!raw) return new Date().getFullYear();
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 2020 && n <= new Date().getFullYear() + 1) {
    return n;
  }
  return new Date().getFullYear();
}

const MONTH_LABELS = [
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

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const year = parseFinanceYear(sp.year);
  const data = await getFinanceReport(year);
  if ("error" in data) return { title: "Relatório · Amazing School" };
  const filename = reportFilename([
    "financeiro",
    slugifyForFilename(data.teacher.fullName ?? "professor"),
    year,
  ]);
  return { title: filename };
}

export default async function FinancePrintPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const year = parseFinanceYear(sp.year);
  const autoprint = sp.autoprint === "1";
  const data = await getFinanceReport(year);
  if ("error" in data) notFound();

  const filename = reportFilename([
    "financeiro",
    slugifyForFilename(data.teacher.fullName ?? "professor"),
    year,
  ]);

  const totalBilled = data.totals.paidCents + data.totals.pendingCents;
  const collectionRate =
    totalBilled > 0
      ? Math.round((data.totals.paidCents / totalBilled) * 100)
      : 0;

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Relatório financeiro"
      subtitle={`${data.teacher.fullName ?? "Professor"} · ${year}`}
      teacher={data.teacher}
      generatedAt={data.generatedAt}
      footerLeft={data.teacher.fullName}
      meta={[
        { label: "Ano", value: String(year) },
        {
          label: "Alunos ativos",
          value: String(data.totals.activeSeats),
        },
      ]}
    >
      {/* Totals */}
      <section className="grid grid-cols-4 gap-3 report-avoid-break">
        <Kpi label="Recebido" value={formatBRL(data.totals.paidCents)} />
        <Kpi label="Pendente" value={formatBRL(data.totals.pendingCents)} />
        <Kpi
          label="Taxa de cobrança"
          value={`${collectionRate}%`}
          sub={`${data.totals.invoicesPaid} de ${
            data.totals.invoicesPaid + data.totals.invoicesPending
          } faturas`}
        />
        <Kpi
          label="Alunos ativos"
          value={data.totals.activeSeats}
          sub="com mensalidade"
        />
      </section>

      {/* Matrix */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Matriz de mensalidades · {year}
        </h2>
        {data.rows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum aluno cadastrado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="mt-2" style={{ fontSize: "9pt" }}>
              <thead>
                <tr>
                  <th style={{ width: "22%", minWidth: 140 }}>Aluno</th>
                  <th style={{ width: "14%" }}>Turma</th>
                  {MONTH_LABELS.map((m) => (
                    <th
                      key={m}
                      style={{
                        textAlign: "center",
                        width: "4.6%",
                        padding: "6px 2px",
                      }}
                    >
                      {m}
                    </th>
                  ))}
                  <th style={{ textAlign: "right", width: "8%" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.rosterStudentId}>
                    <td style={{ fontWeight: 500 }}>{r.studentName}</td>
                    <td className="report-muted">{r.classroomName ?? "—"}</td>
                    {r.months.map((m) => (
                      <td
                        key={m.month}
                        style={{ textAlign: "center", padding: "4px 2px" }}
                      >
                        <CellMark state={m.state} />
                      </td>
                    ))}
                    <td
                      style={{ textAlign: "right", fontWeight: 500 }}
                      className="tabular-nums"
                    >
                      {formatBRL(r.paidCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div
          className="report-muted"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: "8.5pt",
            marginTop: 6,
          }}
        >
          <LegendDot state="paid" label="Pago" />
          <LegendDot state="due" label="Vencendo" />
          <LegendDot state="none" label="—" />
          <span style={{ marginLeft: "auto" }}>
            Taxa de cobrança considera apenas meses marcados como Pago
            ou Vencendo (células vazias não contam).
          </span>
        </div>
      </section>

      <BrandWatermark tagline="Relatório financeiro gerado por Amazing School · amazingschool.app" />
    </ReportShell>
  );
}

function CellMark({ state }: { state: "none" | "due" | "paid" }) {
  const style: React.CSSProperties = {
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: 3,
    verticalAlign: "middle",
  };
  if (state === "paid")
    return <span style={{ ...style, background: "#059669" }} aria-label="Pago" />;
  if (state === "due")
    return (
      <span
        style={{ ...style, background: "#f59e0b" }}
        aria-label="Vencendo"
      />
    );
  return (
    <span
      style={{ ...style, background: "transparent", border: "1px solid #e5e7eb" }}
      aria-label="Sem cobrança"
    />
  );
}

function LegendDot({
  state,
  label,
}: {
  state: "none" | "due" | "paid";
  label: string;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <CellMark state={state} />
      <span>{label}</span>
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="report-kpi">
      <p className="report-kpi-label">{label}</p>
      <p className="report-kpi-value">{value}</p>
      {sub ? <p className="report-kpi-sub">{sub}</p> : null}
    </div>
  );
}
