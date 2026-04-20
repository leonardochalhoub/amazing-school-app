import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCohortReport } from "@/lib/actions/reports";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { parseYear, yearLabel } from "@/lib/reports/period";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    year?: string | string[];
    autoprint?: string | string[];
  }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const data = await getCohortReport(year);
  if ("error" in data) return { title: "Relatório · Amazing School" };
  const filename = reportFilename([
    "cohort",
    slugifyForFilename(data.teacher.fullName ?? "professor"),
    year === "all" ? "historico" : year,
  ]);
  return { title: filename };
}

export default async function CohortPrintPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const year = parseYear(sp.year);
  const autoprint = sp.autoprint === "1";
  const data = await getCohortReport(year);
  if ("error" in data) notFound();

  const filename = reportFilename([
    "cohort",
    slugifyForFilename(data.teacher.fullName ?? "professor"),
    year === "all" ? "historico" : year,
  ]);

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Visão do corpo de alunos"
      subtitle={`${data.teacher.fullName ?? "Professor"} · ${yearLabel(year)}`}
      teacher={data.teacher}
      generatedAt={data.generatedAt}
      footerLeft={data.teacher.fullName}
      meta={[
        { label: "Período", value: yearLabel(year) },
        {
          label: "Alunos",
          value: `${data.totals.students} · Turmas: ${data.totals.classrooms}`,
        },
      ]}
    >
      {/* Totals */}
      <section className="grid grid-cols-4 gap-3 report-avoid-break">
        <Kpi label="Alunos" value={data.totals.students} />
        <Kpi label="Turmas" value={data.totals.classrooms} />
        <Kpi
          label="Lições atribuídas"
          value={data.totals.lessonsAssigned.toLocaleString("pt-BR")}
        />
        <Kpi
          label="Lições concluídas"
          value={data.totals.lessonsCompleted.toLocaleString("pt-BR")}
          sub={
            data.totals.lessonsAssigned > 0
              ? `${Math.round(
                  (data.totals.lessonsCompleted /
                    data.totals.lessonsAssigned) *
                    100,
                )}% do total`
              : undefined
          }
        />
      </section>

      {/* Classrooms */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Turmas
        </h2>
        {data.classrooms.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhuma turma cadastrada.</p>
        ) : (
          <table className="mt-2">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Nome</th>
                <th style={{ width: "25%" }}>Código de convite</th>
                <th style={{ width: "25%", textAlign: "right" }}>Alunos</th>
              </tr>
            </thead>
            <tbody>
              {data.classrooms.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.inviteCode}</td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {c.studentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Roster */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Alunos · desempenho no período
        </h2>
        {data.students.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum aluno no período.</p>
        ) : (
          <table className="mt-2">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Aluno</th>
                <th style={{ width: "20%" }}>Turma</th>
                <th style={{ width: "8%" }}>Nível</th>
                <th style={{ width: "11%", textAlign: "right" }}>XP</th>
                <th style={{ width: "11%", textAlign: "right" }}>Atribuídas</th>
                <th style={{ width: "11%", textAlign: "right" }}>Concluídas</th>
                <th style={{ width: "11%", textAlign: "right" }}>
                  Última atividade
                </th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.fullName}</td>
                  <td className="report-muted">{s.classroomName ?? "—"}</td>
                  <td>{(s.level ?? "—").toUpperCase()}</td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {s.totalXp.toLocaleString("pt-BR")}
                  </td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {s.lessonsAssigned}
                  </td>
                  <td style={{ textAlign: "right" }} className="tabular-nums">
                    {s.lessonsCompleted}
                  </td>
                  <td
                    style={{ textAlign: "right", fontSize: "9pt" }}
                    className="report-muted"
                  >
                    {s.lastActivity
                      ? new Date(s.lastActivity).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <BrandWatermark tagline="Relatório gerado por Amazing School · amazing-school-app.vercel.app" />
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
