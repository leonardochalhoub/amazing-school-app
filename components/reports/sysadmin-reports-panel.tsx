import { PdfButton } from "@/components/reports/pdf-button";
import { Activity } from "lucide-react";

/**
 * Sysadmin-only "Relatórios" strip rendered at the top of the
 * /owner/sysadmin page. Keeps the export surface small: a single
 * button for now (platform overview). Easy to extend by appending
 * more PdfButtons as new reports land.
 */
export function SysadminReportsPanel() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Relatórios em PDF
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Visão agregada · sem dados privados de professores
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold">Visão geral da plataforma</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Escala, atividade dos últimos 30 dias e diretório completo de
              professores.
            </p>
          </div>
          <PdfButton
            href="/print/sysadmin/platform"
            label="Baixar visão geral"
          />
        </div>
      </div>
    </section>
  );
}
