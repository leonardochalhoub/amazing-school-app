import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSysadminReport } from "@/lib/actions/reports";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { reportFilename } from "@/lib/reports/filename";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ autoprint?: string | string[] }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const stamp = new Date().toISOString().slice(0, 10);
  return { title: reportFilename(["amazing-school", "plataforma", stamp]) };
}

export default async function SysadminPrintPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const autoprint = sp.autoprint === "1";
  const data = await getSysadminReport();
  if ("error" in data) notFound();

  const filename = reportFilename([
    "amazing-school",
    "plataforma",
    data.generatedAt.slice(0, 10),
  ]);

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Visão geral da plataforma"
      subtitle="Amazing School · relatório do sistema"
      generatedAt={data.generatedAt}
      meta={[
        {
          label: "Emitido em",
          value: new Date(data.generatedAt).toLocaleString("pt-BR"),
        },
      ]}
    >
      {/* Scale */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Escala
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-3 report-avoid-break">
          <Kpi label="Professores" value={data.scale.teachers} />
          <Kpi
            label="Alunos"
            value={data.scale.students}
            sub={`${data.scale.rosterEntries} entradas na lista`}
          />
          <Kpi label="Turmas" value={data.scale.classrooms} />
          <Kpi label="Lições (catálogo)" value={data.scale.catalogLessons} />
          <Kpi label="Músicas (catálogo)" value={data.scale.catalogSongs} />
        </div>
      </section>

      {/* Activity */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Atividade · últimos 30 dias
        </h2>
        <div className="mt-2 grid grid-cols-4 gap-3 report-avoid-break">
          <Kpi label="DAU" value={data.activity.dau} sub="ativos hoje" />
          <Kpi label="WAU" value={data.activity.wau} sub="últimos 7 dias" />
          <Kpi label="MAU" value={data.activity.mau} sub="últimos 30 dias" />
          <Kpi
            label="XP gerado"
            value={data.activity.xpLast30d.toLocaleString("pt-BR")}
          />
          <Kpi
            label="Lições atribuídas"
            value={data.activity.lessonsAssignedLast30d.toLocaleString("pt-BR")}
          />
          <Kpi
            label="Lições concluídas"
            value={data.activity.lessonsCompletedLast30d.toLocaleString("pt-BR")}
          />
          <Kpi
            label="Mensagens IA"
            value={data.activity.aiMessagesLast30d.toLocaleString("pt-BR")}
          />
          <Kpi label="Novas contas" value={data.activity.newAccountsLast30d} />
        </div>
      </section>

      {/* Teachers directory */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Professores ({data.teachers.length})
        </h2>
        {data.teachers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum professor cadastrado.
          </p>
        ) : (
          <table className="mt-2" style={{ fontSize: "9.5pt" }}>
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Professor</th>
                <th style={{ width: "28%" }}>Email</th>
                <th style={{ textAlign: "right", width: "10%" }}>Alunos</th>
                <th style={{ textAlign: "right", width: "10%" }}>Turmas</th>
                <th style={{ textAlign: "right", width: "12%" }}>Ativos 30d</th>
                <th style={{ textAlign: "right", width: "12%" }}>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {[...data.teachers]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.name ?? "—"}</td>
                    <td className="report-muted" style={{ fontSize: "9pt" }}>
                      {t.email ?? "—"}
                    </td>
                    <td style={{ textAlign: "right" }} className="tabular-nums">
                      {t.studentCount}
                    </td>
                    <td style={{ textAlign: "right" }} className="tabular-nums">
                      {t.classroomsCount}
                    </td>
                    <td style={{ textAlign: "right" }} className="tabular-nums">
                      {t.activeStudentsLast30d}
                    </td>
                    <td
                      style={{ textAlign: "right", fontSize: "9pt" }}
                      className="report-muted tabular-nums"
                    >
                      {new Date(t.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <BrandWatermark tagline="Relatório de plataforma · Amazing School · amazing-school-app.vercel.app" />
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
