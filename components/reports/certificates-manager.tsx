"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/context";
import { IssueCertificateButton } from "@/components/reports/issue-certificate-button";
import { CertificateDownloadButton } from "@/components/reports/certificate-download-button";
import { DeleteCertificateButton } from "@/components/reports/delete-certificate-button";
import {
  findCertificateLevel,
  findGrade,
} from "@/lib/reports/certificate-levels";
import type { TeacherCertificateRow } from "@/lib/actions/certificates";

interface StudentOption {
  id: string;
  fullName: string;
  billingStartsOn: string | null;
  createdAt: string | null;
}

interface Props {
  certificates: TeacherCertificateRow[];
  students: StudentOption[];
  /** Override the label on the trigger button. Default is
      locale-aware "Certificados / Certificates" — pass a different
      value (e.g. "Ver todos") when you render the inline top-10 list
      next to it. */
  triggerLabelEn?: string;
  triggerLabelPt?: string;
}

function fmtDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("pt-BR");
  const e = new Date(end).toLocaleDateString("pt-BR");
  return `${s} → ${e}`;
}

/**
 * Central certificate hub on /teacher/admin. Replaces the per-student
 * panels — emitting a certificate is a moment, not a daily task, so
 * the surface stays compact: one button that opens a dialog with the
 * full list + an "Emitir certificado" action.
 */
export function CertificatesManager({
  certificates,
  students,
  triggerLabelEn,
  triggerLabelPt,
}: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerLabel =
    (locale === "pt-BR" ? triggerLabelPt : triggerLabelEn) ??
    (locale === "pt-BR" ? "Certificados" : "Certificates");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) => {
      const lvl = findCertificateLevel(c.level);
      const hay =
        `${c.studentName} ${c.classroomName ?? ""} ${
          c.title ?? ""
        } ${lvl?.codeLabel ?? c.level} ${lvl?.title ?? ""} ${c.grade}`.toLowerCase();
      return hay.includes(q);
    });
  }, [certificates, query]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        {triggerLabel}
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {certificates.length}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>
              {locale === "pt-BR"
                ? "Certificados emitidos"
                : "Issued certificates"}
            </DialogTitle>
            <DialogDescription>
              {locale === "pt-BR"
                ? "Emita novos certificados CEFR ou personalizados e baixe os PDFs em português e inglês."
                : "Issue new CEFR or custom certificates and download PDFs in both pt-BR and English."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  locale === "pt-BR"
                    ? "Filtrar por aluno, nível, conceito, título…"
                    : "Filter by student, level, grade, title…"
                }
                className="h-9 pl-8"
              />
            </div>
            <IssueCertificateButton students={students} />
          </div>

          <div className="min-h-0 flex-1 overflow-auto border-t border-border">
            {filtered.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {certificates.length === 0
                  ? locale === "pt-BR"
                    ? "Nenhum certificado emitido ainda. Clique em Emitir certificado para criar o primeiro."
                    : "No certificates issued yet. Click Issue certificate to create the first one."
                  : locale === "pt-BR"
                    ? "Nenhum resultado para esse filtro."
                    : "No results for that filter."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => {
                  const lvl = findCertificateLevel(c.level);
                  const g = findGrade(c.grade);
                  const isCustom = c.level === "custom";
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs hover:bg-muted/30"
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
                          {isCustom
                            ? (c.title ?? "—")
                            : `${lvl?.codeLabel ?? c.level.toUpperCase()} · ${lvl?.title ?? c.level}`}
                          {" · "}
                          {fmtDateRange(c.courseStartOn, c.courseEndOn)}
                          {c.totalHours ? ` · ${c.totalHours}h` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <CertificateDownloadButton certificateId={c.id} />
                        <DeleteCertificateButton id={c.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
