import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeacherOwnCurriculumReport } from "@/lib/actions/teacher-curriculum";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { MonthlyCompletionsChart } from "@/components/reports/charts";
import { parseYear, yearLabel } from "@/lib/reports/period";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{
    year?: string | string[];
    autoprint?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { teacherId } = await params;
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const data = await getTeacherOwnCurriculumReport(teacherId, year);
  if ("error" in data) return { title: "Relatório · Amazing School" };
  return {
    title: reportFilename([
      "curriculo",
      data.teacher.fullName,
      year === "all" ? "historico" : year,
    ]),
  };
}

export default async function TeacherOwnCurriculumPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { teacherId } = await params;
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const autoprint = sp.autoprint === "1";
  const data = await getTeacherOwnCurriculumReport(teacherId, year);
  if ("error" in data) notFound();

  const { teacher, entries, stats, live } = data;
  const filename = reportFilename([
    "curriculo",
    slugifyForFilename(teacher.fullName),
    year === "all" ? "historico" : year,
  ]);
  const periodLabel = yearLabel(year);

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Currículo do professor"
      subtitle={teacher.fullName}
      teacher={teacher}
      generatedAt={data.generatedAt}
      footerLeft={teacher.fullName}
      meta={[
        { label: "Período", value: periodLabel },
        {
          label: teacher.gender === "female" ? "Professora" : "Professor",
          value: teacher.fullName,
        },
      ]}
    >
      {/* KPI strip */}
      <section className="grid grid-cols-4 gap-3 report-avoid-break">
        <Kpi label="Auto-atribuídas" value={stats.selfAssigned} />
        <Kpi
          label="Concluídas"
          value={stats.selfCompleted}
          sub={
            stats.selfAssigned > 0
              ? `${Math.round(
                  (stats.selfCompleted / stats.selfAssigned) * 100,
                )}% concluídas`
              : undefined
          }
        />
        <Kpi label="XP · total" value={stats.totalXp.toLocaleString("pt-BR")} />
        <Kpi
          label="Minutos estimados"
          value={fmtHours(stats.estimatedMinutes)}
        />
      </section>

      {/* Aulas ao vivo — hours delivered, with Conversação + Escuta
          embedded. Only renders when the teacher has Done classes in
          the period. */}
      {live.classCount > 0 ? (
        <section className="report-avoid-break">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Aulas ao vivo
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-3">
            <Kpi
              label="Aulas ministradas"
              value={live.classCount}
              sub={`${Math.round(live.totalMinutes / 6) / 10}h no total`}
            />
            <Kpi
              label="Conversação"
              value={`${Math.round(live.speakingMinutes / 6) / 10}h`}
              sub={`${live.speakingMinutes} min`}
            />
            <Kpi
              label="Escuta"
              value={`${Math.round(live.listeningMinutes / 6) / 10}h`}
              sub={`${live.listeningMinutes} min`}
            />
            <Kpi
              label="Outros focos"
              value={`${Math.round(live.otherMinutes / 6) / 10}h`}
              sub={`${live.otherMinutes} min`}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Cada aula é registrada com data, horário, duração e foco
            pedagógico. Uma aula marcada com Conversação + Escuta tem
            seu tempo dividido entre os dois focos.
          </p>
        </section>
      ) : null}

      {/* Monthly activity chart */}
      {stats.byMonth.length > 0 ? (
        <section className="report-avoid-break">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Atividade
          </h2>
          <div style={{ marginTop: 12 }}>
            <p className="mb-1 text-xs text-slate-500">Conclusões por mês</p>
            <MonthlyCompletionsChart
              data={stats.byMonth}
              width={520}
              height={200}
            />
          </div>
        </section>
      ) : null}

      {/* Entries list */}
      {entries.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Registros
          </h2>
          <table className="mt-2 w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-1">Tipo</th>
                <th className="py-1">Título</th>
                <th className="py-1">Foco</th>
                <th className="py-1">CEFR</th>
                <th className="py-1 text-right">Data</th>
                <th className="py-1 text-right">Min</th>
                <th className="py-1 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={`${e.kind}:${e.slug}:${e.assignedAt ?? ""}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-1">
                    {e.kind === "live"
                      ? "Aula"
                      : e.kind === "music"
                        ? "Música"
                        : "Lição"}
                  </td>
                  <td className="py-1">{e.title}</td>
                  <td className="py-1">{e.category ?? "—"}</td>
                  <td className="py-1">{e.cefr?.toUpperCase() ?? "—"}</td>
                  <td className="py-1 text-right">
                    {fmtDate(e.completedAt ?? e.assignedAt)}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {e.minutes ?? "—"}
                  </td>
                  <td className="py-1 text-right">
                    {e.status === "completed" ? "✓" : "pendente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <BrandWatermark />
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

function fmtHours(totalMinutes: number): string {
  if (!totalMinutes) return "0 min";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
