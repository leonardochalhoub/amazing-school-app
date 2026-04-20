import { YearSelector } from "@/components/reports/year-selector";
import { availableYears } from "@/lib/reports/period";
import { FileText, CircleDollarSign, Users } from "lucide-react";

interface TeacherReportsPanelProps {
  /** Seed timestamps (student enrollments, earliest payment) used to
      build the list of years offered in the selector. */
  seedDates: Array<string | null | undefined>;
}

/**
 * Compact report panel rendered at the top of the teacher management
 * page. Offers cohort + financial PDF exports with inline year
 * selectors so the teacher can pick "2025 / 2026 / tudo" before clicking.
 */
export function TeacherReportsPanel({ seedDates }: TeacherReportsPanelProps) {
  const years = availableYears(seedDates);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Relatórios em PDF
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Formato A4 · com logo da escola · prontos para impressão
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold">Visão do corpo de alunos</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lista de turmas, desempenho de cada aluno e total de XP no ano
            selecionado.
          </p>
          <div className="mt-3">
            <YearSelector
              years={years}
              buildHref={(y) =>
                `/print/teacher/cohort?year=${y}&autoprint=1`
              }
              label="Baixar visão"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold">Relatório financeiro</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Matriz anual de mensalidades com totais de recebido, pendente e
            taxa de cobrança.
          </p>
          <div className="mt-3">
            <YearSelector
              years={years}
              includeAll={false}
              buildHref={(y) =>
                `/print/teacher/finance?year=${y}&autoprint=1`
              }
              label="Baixar financeiro"
            />
          </div>
        </div>
      </div>
      {/* Tip — keeps teachers from hunting for where receipts live */}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" />
        Recibos individuais de mensalidade: entre no cadastro do aluno e
        baixe diretamente da aba "Documentos".
      </p>
    </section>
  );
}
