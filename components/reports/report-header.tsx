import Image from "next/image";
import { schoolLogoPublicUrl, SCHOOL_LOGO_SRC } from "@/lib/school-logo";

interface ReportHeaderProps {
  title: string;
  subtitle?: string | null;
  meta?: Array<{ label: string; value: string }>;
  /** Teacher's profile — used to decide whether to show the custom
      school logo alongside the Amazing School mark. */
  teacher?: {
    schoolLogoEnabled?: boolean | null;
    schoolLogoUrl?: string | null;
    fullName?: string | null;
  } | null;
}

export function ReportHeader({
  title,
  subtitle,
  meta,
  teacher,
}: ReportHeaderProps) {
  const teacherLogo =
    teacher?.schoolLogoEnabled && teacher.schoolLogoUrl
      ? schoolLogoPublicUrl(teacher.schoolLogoUrl)
      : null;

  return (
    <header className="report-header">
      <div className="report-header-left">
        <div className="report-logo-box">
          <Image
            src={SCHOOL_LOGO_SRC}
            alt="Amazing School"
            width={120}
            height={36}
            unoptimized
            priority
          />
        </div>
        {teacherLogo ? (
          <div className="report-logo-box" aria-label={teacher?.fullName ?? undefined}>
            {/* Teacher-uploaded logo — proxied through <Image> with
                `unoptimized` so no Vercel image-optimisation fees on
                self-hosted Supabase URLs. */}
            <Image
              src={teacherLogo}
              alt={teacher?.fullName ? `${teacher.fullName} — logo` : "School logo"}
              width={120}
              height={36}
              unoptimized
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="report-title">{title}</h1>
          {subtitle ? <p className="report-subtitle">{subtitle}</p> : null}
        </div>
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
    </header>
  );
}
