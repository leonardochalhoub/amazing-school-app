"use client";

/**
 * Two side-by-side flag buttons, one per language. Clicking a flag
 * opens the certificate print page in that language and auto-prints
 * it — user saves a PDF whose filename already carries the language
 * tag ("…-pt-br.pdf" or "…-en.pdf").
 *
 * We deliberately avoid a single "download both" button: browsers
 * can't save two PDFs from a single click without a server-side
 * PDF library, and keeping the two actions visible + separate
 * matches the teacher's real workflow (share one, archive the other).
 */
export function CertificateDownloadButton({
  certificateId,
}: {
  certificateId: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
      <a
        href={`/print/certificate/${certificateId}?lang=pt-BR&autoprint=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium hover:bg-muted"
        title="Baixar em português"
        aria-label="Baixar certificado em português"
      >
        <span aria-hidden style={{ fontSize: "13px", lineHeight: 1 }}>
          🇧🇷
        </span>
        PT
      </a>
      <span className="h-4 w-px bg-border" aria-hidden />
      <a
        href={`/print/certificate/${certificateId}?lang=en&autoprint=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium hover:bg-muted"
        title="Download in English"
        aria-label="Download certificate in English"
      >
        <span aria-hidden style={{ fontSize: "13px", lineHeight: 1 }}>
          🇺🇸
        </span>
        EN
      </a>
    </div>
  );
}
