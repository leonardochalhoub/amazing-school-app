import { schoolLogoPublicUrl, SCHOOL_LOGO_SRC, isLogoEligible } from "@/lib/school-logo";
import { AmazingSchoolMark } from "@/components/reports/amazing-school-mark";

interface ReportHeaderProps {
  title: string;
  subtitle?: string | null;
  meta?: Array<{ label: string; value: string }>;
  teacher?: {
    schoolLogoEnabled?: boolean | null;
    schoolLogoUrl?: string | null;
    fullName?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Every shell-based report header follows this three-part layout:
 *
 *   [teacher school logo]  [title]          [Amazing School mark]
 *
 * Teacher's own school brand reads first on the LEFT (the document
 * belongs to that school), and the Amazing School mark sits on the
 * RIGHT as the "powered-by" platform identity. Both are always
 * printed — hard rule documented in .claude/CLAUDE.md.
 */
export function ReportHeader({
  title,
  subtitle,
  meta,
  teacher,
}: ReportHeaderProps) {
  const uploadedLogo =
    teacher?.schoolLogoEnabled && teacher.schoolLogoUrl
      ? schoolLogoPublicUrl(teacher.schoolLogoUrl)
      : null;
  const whitelistLogo =
    teacher?.schoolLogoEnabled &&
    !uploadedLogo &&
    isLogoEligible(teacher.email ?? null, teacher.fullName ?? "")
      ? SCHOOL_LOGO_SRC
      : null;
  const teacherLogo = uploadedLogo ?? whitelistLogo;

  return (
    <header className="report-header">
      <div className="report-header-left">
        {/* LEFT — teacher's school logo. */}
        {teacherLogo ? (
          <div
            className="report-logo-box"
            aria-label={teacher?.fullName ?? undefined}
          >
            {/* Plain <img>: next/image can drop assets in print. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teacherLogo}
              alt={
                teacher?.fullName
                  ? `${teacher.fullName} — logo`
                  : "School logo"
              }
              style={{
                maxHeight: 30,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="report-title">{title}</h1>
          {subtitle ? <p className="report-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {/* RIGHT — Amazing School platform mark. */}
        <div className="report-logo-box" style={{ paddingInline: 10 }}>
          <AmazingSchoolMark size={22} />
        </div>
        {meta && meta.length > 0 ? (
          <div className="report-meta">
            {meta.map((m) => (
              <div key={m.label}>
                <span className="report-muted">{m.label}: </span>
                <span>{m.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
