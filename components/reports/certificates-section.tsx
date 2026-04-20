import { GraduationCap } from "lucide-react";
import { IssueCertificateButton } from "@/components/reports/issue-certificate-button";
import { CertificatesManager } from "@/components/reports/certificates-manager";
import { CertificateDownloadButton } from "@/components/reports/certificate-download-button";
import { T } from "@/components/reports/t";
import {
  findCertificateLevel,
  findGrade,
} from "@/lib/reports/certificate-levels";
import type { TeacherCertificateRow } from "@/lib/actions/certificates";

interface Props {
  certificates: TeacherCertificateRow[];
  students: Array<{
    id: string;
    fullName: string;
    billingStartsOn: string | null;
    createdAt: string | null;
  }>;
}

/**
 * Inline "Certificados" card for the Management page — shows the 10
 * most recent as a compact table (Student, Date, Title, Grade),
 * with an inline "Emitir" action and a "Ver todos" button that
 * opens the full manager dialog. Replaces the per-student panel
 * placement — certificates are moments, not daily noise.
 */
export function CertificatesSection({ certificates, students }: Props) {
  const top = certificates.slice(0, 10);
  const hasMore = certificates.length > 10;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          <T en="Certificates" pt="Certificados" />
          {certificates.length > 0 ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {certificates.length}
            </span>
          ) : null}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <IssueCertificateButton students={students} variant="subtle" />
          <CertificatesManager
            certificates={certificates}
            students={students}
            triggerLabelEn={hasMore ? "See all" : "Open manager"}
            triggerLabelPt={hasMore ? "Ver todos" : "Abrir painel"}
          />
        </div>
      </div>

      {certificates.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          <T
            en="No certificate issued yet. Click Issue certificate to generate the first one."
            pt="Nenhum certificado emitido ainda. Clique em Emitir certificado para gerar o primeiro."
          />
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">
                  <T en="Student" pt="Aluno" />
                </th>
                <th className="px-3 py-2">
                  <T en="Issued on" pt="Emitido em" />
                </th>
                <th className="px-3 py-2">
                  <T en="Title" pt="Título" />
                </th>
                <th className="px-3 py-2 text-center">
                  <T en="Grade" pt="Conceito" />
                </th>
                <th className="px-3 py-2 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c) => {
                const lvl = findCertificateLevel(c.level);
                const g = findGrade(c.grade);
                const isCustom = c.level === "custom";
                const title = isCustom
                  ? (c.title ?? "—")
                  : (c.title ??
                    `${lvl?.codeLabel ?? c.level.toUpperCase()} · ${lvl?.title ?? c.level}`);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {c.studentName}
                      {c.classroomName ? (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          · {c.classroomName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {new Date(c.issuedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {title}
                      {c.totalHours ? (
                        <span className="ml-1 text-muted-foreground">
                          · {c.totalHours}h
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: g?.color ?? "#64748b" }}
                        aria-label={`Grade ${c.grade}`}
                      >
                        {c.grade}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <CertificateDownloadButton certificateId={c.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
