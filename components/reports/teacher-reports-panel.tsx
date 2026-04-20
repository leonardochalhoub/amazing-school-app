import { YearSelector } from "@/components/reports/year-selector";
import { ReceiptsQueryDialog } from "@/components/reports/receipts-query-dialog";
import { T } from "@/components/reports/t";
import { availableYears } from "@/lib/reports/period";
import { FileText, CircleDollarSign, Users } from "lucide-react";
import type { TeacherReceiptRow } from "@/lib/actions/reports";

interface TeacherReportsPanelProps {
  seedDates: Array<string | null | undefined>;
  receipts: TeacherReceiptRow[];
}

export function TeacherReportsPanel({
  seedDates,
  receipts,
}: TeacherReportsPanelProps) {
  const years = availableYears(seedDates);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="PDF reports" pt="Relatórios em PDF" />
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <ReceiptsQueryDialog receipts={receipts} />
          <p className="text-[11px] text-muted-foreground">
            <T
              en="A4 · school logo · ready to print"
              pt="A4 · logo da escola · prontos para impressão"
            />
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold">
              <T en="Cohort overview" pt="Visão do corpo de alunos" />
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <T
              en="List of classrooms, per-student performance, and total XP for the selected year."
              pt="Lista de turmas, desempenho de cada aluno e total de XP no ano selecionado."
            />
          </p>
          <div className="mt-3">
            <YearSelector
              years={years}
              hrefTemplate="/print/teacher/cohort?year={year}&autoprint=1"
              labelEn="Download overview"
              labelPt="Baixar visão"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-semibold">
              <T en="Financial report" pt="Relatório financeiro" />
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <T
              en="Annual tuition matrix with totals for paid, pending, and collection rate."
              pt="Matriz anual de mensalidades com totais de recebido, pendente e taxa de cobrança."
            />
          </p>
          <div className="mt-3">
            <YearSelector
              years={years}
              includeAll={false}
              hrefTemplate="/print/teacher/finance?year={year}&autoprint=1"
              labelEn="Download financial"
              labelPt="Baixar financeiro"
            />
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" />
        <T
          en="Individual tuition receipts: open a student from the roster and download from the Documents card."
          pt="Recibos individuais de mensalidade: abra o aluno no painel e baixe pelo card Documentos."
        />
      </p>
    </section>
  );
}
