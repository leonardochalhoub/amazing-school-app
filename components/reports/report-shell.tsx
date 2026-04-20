import type { ReactNode } from "react";
import { AutoPrint } from "./auto-print";
import { PrintToolbar } from "./print-toolbar";
import { ReportHeader } from "./report-header";
import { ReportFooter } from "./report-footer";

interface ReportShellProps {
  title: string;
  subtitle?: string | null;
  meta?: Array<{ label: string; value: string }>;
  teacher?: {
    schoolLogoEnabled?: boolean | null;
    schoolLogoUrl?: string | null;
    fullName?: string | null;
    email?: string | null;
  } | null;
  /** Default filename shown in the preview toolbar — browsers use
      document.title for the actual Save-as-PDF default, which should
      be set via `export const metadata` on the page. */
  filename: string;
  /** Trigger window.print() automatically after mount. Controlled by
      `?autoprint=1` on the URL (see page-level code). */
  autoPrint?: boolean;
  generatedAt?: string;
  footerLeft?: string | null;
  children: ReactNode;
}

/**
 * Shared A4 wrapper for every report. Produces the same paper layout
 * on-screen and in print: header with logos + title, content body,
 * consistent footer.
 */
export function ReportShell({
  title,
  subtitle,
  meta,
  teacher,
  filename,
  autoPrint,
  generatedAt,
  footerLeft,
  children,
}: ReportShellProps) {
  return (
    <>
      <PrintToolbar filename={filename} />
      <AutoPrint enabled={!!autoPrint} />
      <article className="report-page">
        <ReportHeader
          title={title}
          subtitle={subtitle}
          meta={meta}
          teacher={teacher}
        />
        <div className="space-y-5">{children}</div>
        <ReportFooter
          generatedAt={generatedAt}
          left={footerLeft}
        />
      </article>
    </>
  );
}
