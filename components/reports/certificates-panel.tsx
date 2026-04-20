import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, FileText } from "lucide-react";
import { IssueCertificateButton } from "@/components/reports/issue-certificate-button";
import { DeleteCertificateButton } from "@/components/reports/delete-certificate-button";
import {
  findCertificateLevel,
  findGrade,
} from "@/lib/reports/certificate-levels";
import type { CertificateSummary } from "@/lib/actions/certificates";

interface Props {
  rosterStudentId: string;
  studentName: string;
  defaultStartOn: string | null;
  certificates: CertificateSummary[];
  /** When true the panel becomes read-only (used on student profile). */
  readOnly?: boolean;
}

function fmtDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("pt-BR");
  const e = new Date(end).toLocaleDateString("pt-BR");
  return `${s} → ${e}`;
}

/**
 * Certificates card — teacher side exposes "Emitir certificado" plus
 * per-row delete; student side is read-only.
 */
export function CertificatesPanel({
  rosterStudentId,
  studentName,
  defaultStartOn,
  certificates,
  readOnly = false,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          Certificados
          {certificates.length > 0 ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">
              {certificates.length}
            </span>
          ) : null}
        </CardTitle>
        {!readOnly ? (
          <IssueCertificateButton
            rosterStudentId={rosterStudentId}
            studentName={studentName}
            defaultStartOn={defaultStartOn}
          />
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Alinhado ao <span className="font-semibold">CEFR</span> (Common
          European Framework of Reference for Languages) — mesma escala
          usada por Cambridge, Cultura Inglesa e demais escolas.
        </p>
        {certificates.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {readOnly
              ? "Nenhum certificado emitido ainda. Seu professor pode emitir quando um módulo for concluído."
              : "Nenhum certificado emitido ainda. Emita o primeiro quando o aluno concluir um nível."}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {certificates.map((d) => {
              const lvl = findCertificateLevel(d.level);
              const g = findGrade(d.grade);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3 text-xs"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: g?.color ?? "#64748b" }}
                    aria-label={`Conceito ${d.grade}`}
                  >
                    {d.grade}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {d.title ??
                        `Certificado · ${lvl?.codeLabel ?? d.level.toUpperCase()}`}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {lvl?.title ?? d.level} ·{" "}
                      {fmtDateRange(d.courseStartOn, d.courseEndOn)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <a
                      href={`/print/certificate/${d.id}?autoprint=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                    >
                      <FileText className="h-3 w-3" />
                      Baixar
                    </a>
                    {!readOnly ? <DeleteCertificateButton id={d.id} /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
