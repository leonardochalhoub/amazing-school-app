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
 * Every shell-based report header follows the same three-part
 * structure:
 *
 *   [Amazing School mark]  [title]          [teacher school logo]
 *
 * Amazing School (purple smiley + italic wordmark) sits on the
 * LEFT because the platform identity reads first. The teacher's
 * own school brand goes on the RIGHT, mirroring the canonical
 * "institutional letterhead" look. Both are always printed — this
 * is the hard rule documented in .claude/CLAUDE.md.
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
        {/* LEFT — Amazing School platform mark. */}
        <div className="report-logo-box" style={{ paddingInline: 10 }}>
          <AmazingSchoolMark size={22} />
        </div>
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
        {/* RIGHT — teacher's own school logo. Always shown when the
            teacher has one configured (uploaded > whitelisted). */}
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
