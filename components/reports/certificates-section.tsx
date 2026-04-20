import { GraduationCap, Plus } from "lucide-react";
import { IssueCertificateButton } from "@/components/reports/issue-certificate-button";
import { CertificatesManager } from "@/components/reports/certificates-manager";
import { CertificateDownloadButton } from "@/components/reports/certificate-download-button";
import { DeleteCertificateButton } from "@/components/reports/delete-certificate-button";
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

const TOP = 3;

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Inline "Certificados" card on the Management page — shows the
 * 3 most recent certificates (descending by issued_at) with
 * date + time, then a "+" button that opens the full manager
 * dialog when the teacher wants to see the rest.
 */
export function CertificatesSection({ certificates, students }: Props) {
  const top = certificates.slice(0, TOP);
  const remainder = Math.max(0, certificates.length - TOP);

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
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {top.map((c) => {
            const lvl = findCertificateLevel(c.level);
            const g = findGrade(c.grade);
            const isCustom = c.level === "custom";
            const title = isCustom
              ? (c.title ?? "—")
              : (c.title ??
                `${lvl?.codeLabel ?? c.level.toUpperCase()} · ${lvl?.title ?? c.level}`);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 px-3 py-3 text-xs"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: g?.color ?? "#64748b" }}
                  aria-label={`Grade ${c.grade}`}
                >
                  {c.grade}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {c.studentName}
                    {c.classroomName ? (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        · {c.classroomName}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {title}
                    {c.totalHours ? (
                      <span className="ml-1">· {c.totalHours}h</span>
                    ) : null}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground tabular-nums">
                    <T en="Issued" pt="Emitido" />:{" "}
                    {fmtDateTime(c.issuedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <CertificateDownloadButton certificateId={c.id} />
                  <DeleteCertificateButton id={c.id} />
                </div>
              </li>
            );
          })}
          {/* "+" row — opens the full manager dialog if there are
              more certificates to see. Wraps CertificatesManager so
              the trigger button renders inline with a plus sign
              instead of the default "Ver todos" label. */}
          {remainder > 0 ? (
            <li className="flex items-center justify-center bg-muted/30 px-3 py-2 text-xs">
              <div className="inline-flex items-center gap-2">
                <Plus className="h-3 w-3 text-muted-foreground" />
                <CertificatesManager
                  certificates={certificates}
                  students={students}
                  triggerLabelPt={`Mais ${remainder}`}
                  triggerLabelEn={`+${remainder} more`}
                />
              </div>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
