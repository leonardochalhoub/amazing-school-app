import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentCurriculumReport } from "@/lib/actions/reports";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import {
  CefrMixChart,
  MonthlyCompletionsChart,
} from "@/components/reports/charts";
import { parseYear, yearLabel } from "@/lib/reports/period";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";
import {
  inferGenderFromName,
  teacherTitle,
} from "@/lib/reports/gendered-titles";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ rosterId: string }>;
  searchParams: Promise<{
    year?: string | string[];
    autoprint?: string | string[];
  }>;
}

// Dynamic metadata so `document.title` — and therefore the browser's
// default "Save as PDF" filename — matches the student + period.
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { rosterId } = await params;
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const data = await getStudentCurriculumReport(rosterId, year);
  if ("error" in data) return { title: "Relatório · Amazing School" };
  const filename = reportFilename([
    "curriculo",
    data.student.fullName,
    year === "all" ? "historico" : year,
  ]);
  return { title: filename };
}

export default async function StudentCurriculumPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { rosterId } = await params;
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const autoprint = sp.autoprint === "1";
  const data = await getStudentCurriculumReport(rosterId, year);
  if ("error" in data) notFound();

  const filename = reportFilename([
    "curriculo",
    slugifyForFilename(data.student.fullName),
    year === "all" ? "historico" : year,
  ]);
  const periodLabel = yearLabel(year);

  const { student, teacher, stats, entries } = data;

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Currículo do aluno"
      subtitle={`${student.fullName}${student.classroomName ? ` · ${student.classroomName}` : ""}`}
      teacher={teacher}
      generatedAt={data.generatedAt}
      footerLeft={teacher.fullName}
      meta={[
        { label: "Período", value: periodLabel },
        { label: "Nível", value: (student.level ?? "—").toUpperCase() },
        {
          label: "Início",
          value: student.billingStartsOn
            ? new Date(student.billingStartsOn).toLocaleDateString("pt-BR")
            : "—",
        },
      ]}
    >
      {/* KPI strip */}
      <section className="grid grid-cols-4 gap-3 report-avoid-break">
        <Kpi label="Atribuídas" value={stats.totalAssigned} />
        <Kpi
          label="Concluídas"
          value={stats.totalCompleted}
          sub={
            stats.totalAssigned > 0
              ? `${Math.round(
                  (stats.totalCompleted / stats.totalAssigned) * 100,
                )}%`
              : undefined
          }
        />
        <Kpi
          label="XP acumulado"
          value={stats.totalXp.toLocaleString("pt-BR")}
        />
        <Kpi label="Períodos" value={stats.byMonth.length} sub="meses ativos" />
      </section>

      {/* Charts — forced side by side, each gets half the inner
          page width. No flex-wrap so the A4 preview never stacks
          them awkwardly. */}
      {stats.byMonth.length > 0 || stats.byCefr.length > 0 ? (
        <section className="report-avoid-break">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Atividade
          </h2>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              <p className="mb-1 text-xs text-slate-500">
                Conclusões por mês
              </p>
              {stats.byMonth.length > 0 ? (
                <MonthlyCompletionsChart
                  data={stats.byMonth}
                  width={320}
                  height={200}
                />
              ) : (
                <p className="text-xs text-slate-400">Sem conclusões no período.</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">
                Mix CEFR (atribuídas)
              </p>
              {stats.byCefr.length > 0 ? (
                <CefrMixChart
                  data={stats.byCefr}
                  width={320}
                  height={200}
                />
              ) : (
                <p className="text-xs text-slate-400">Sem itens classificados.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Teacher sign-off — optional signature image + printed name. */}
      <section className="report-avoid-break" style={{ marginTop: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <div style={{ textAlign: "right" }}>
            {teacher.signatureEnabled && teacher.signatureUrl ? (
              <div
                style={{
                  height: 44,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={teacher.signatureUrl}
                  alt={`Assinatura de ${teacher.fullName ?? "professor"}`}
                  style={{
                    maxHeight: 40,
                    maxWidth: 200,
                    objectFit: "contain",
                  }}
                />
              </div>
            ) : null}
            <div
              style={{
                borderTop: "1px solid #9ca3af",
                paddingTop: 4,
                fontSize: "9.5pt",
                minWidth: 200,
              }}
            >
              {/* Name line always prints; the label line below is
                  purely descriptive. Falling back to email prevents
                  the old "label duplicated on both lines" bug. */}
              <span style={{ fontWeight: 600 }}>
                {teacher.fullName || teacher.email || "—"}
              </span>
              <br />
              <span className="report-muted">
                {teacherTitle(inferGenderFromName(teacher.fullName))}{" "}
                Responsável
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum table */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Conteúdos
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum conteúdo atribuído no período selecionado.
          </p>
        ) : (
          <table className="mt-2">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Conteúdo</th>
                <th style={{ width: "10%" }}>Tipo</th>
                <th style={{ width: "9%" }}>Nível</th>
                <th style={{ width: "14%" }}>Atribuído em</th>
                <th style={{ width: "14%" }}>Concluído em</th>
                <th style={{ width: "11%", textAlign: "right" }}>XP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={`${e.kind}:${e.slug}:${e.assignedAt ?? ""}`}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{e.title}</span>
                    {e.category && e.kind === "lesson" ? (
                      <span className="report-muted"> · {e.category}</span>
                    ) : null}
                  </td>
                  <td>{e.kind === "music" ? "Música" : "Lição"}</td>
                  <td>{(e.cefr ?? "—").toUpperCase()}</td>
                  <td>{fmtDate(e.assignedAt)}</td>
                  <td>
                    {e.status === "completed" ? (
                      <span style={{ color: "#047857", fontWeight: 500 }}>
                        {fmtDate(e.completedAt)}
                      </span>
                    ) : e.status === "skipped" ? (
                      <span className="report-muted">Pulado</span>
                    ) : (
                      <span className="report-muted">Pendente</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {e.status === "completed" && e.xpEarned != null
                      ? e.xpEarned.toLocaleString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <BrandWatermark tagline="Currículo gerado por Amazing School · amazing-school-app.vercel.app" />
    </ReportShell>
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
