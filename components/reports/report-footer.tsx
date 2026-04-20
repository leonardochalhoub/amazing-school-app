interface ReportFooterProps {
  /** Raw ISO timestamp; will be formatted in BR locale. */
  generatedAt?: string;
  /** Free-form left-hand footer string — e.g. teacher or school name. */
  left?: string | null;
  /** Free-form right-hand footer string — e.g. "Amazing School · amazing-school-app.vercel.app". */
  right?: string | null;
}

export function ReportFooter({
  generatedAt,
  left,
  right,
}: ReportFooterProps) {
  const when = generatedAt ? new Date(generatedAt) : new Date();
  const stamp = when.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <footer className="report-footer">
      <span>
        {left ?? ""}
        {left ? " · " : ""}
        <span className="report-muted">
          Gerado em {stamp}
        </span>
      </span>
      <span className="report-muted">
        {right ?? "Amazing School · amazing-school-app.vercel.app"}
      </span>
    </footer>
  );
}
