import { PdfButton } from "@/components/reports/pdf-button";
import { T } from "@/components/reports/t";
import { Activity } from "lucide-react";

export function SysadminReportsPanel() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="PDF reports" pt="Relatórios em PDF" />
        </h2>
        <p className="text-[11px] text-muted-foreground">
          <T
            en="Aggregate view · no private teacher data"
            pt="Visão agregada · sem dados privados de professores"
          />
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold">
                <T en="Platform overview" pt="Visão geral da plataforma" />
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <T
                en="Scale, 30-day activity, and the complete teacher directory."
                pt="Escala, atividade dos últimos 30 dias e diretório completo de professores."
              />
            </p>
          </div>
          <PdfButton
            href="/print/sysadmin/platform"
            labelEn="Download overview"
            labelPt="Baixar visão geral"
          />
        </div>
      </div>
    </section>
  );
}
