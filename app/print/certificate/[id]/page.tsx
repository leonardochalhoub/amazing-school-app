import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCertificate } from "@/lib/actions/certificates";
import { AutoPrint } from "@/components/reports/auto-print";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";
import { schoolLogoPublicUrl, SCHOOL_LOGO_SRC, isLogoEligible } from "@/lib/school-logo";
import { AmazingSchoolMark } from "@/components/reports/amazing-school-mark";
import {
  inferGenderFromName,
  teacherTitle,
} from "@/lib/reports/gendered-titles";
import {
  findCertificateLevel,
  findGrade,
} from "@/lib/reports/certificate-levels";

export const dynamic = "force-dynamic";

type Lang = "pt-BR" | "en";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    autoprint?: string | string[];
    lang?: string | string[];
  }>;
}

function readLang(raw: string | string[] | undefined): Lang {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "en" ? "en" : "pt-BR";
}

function fmtLongDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(
    lang === "pt-BR" ? "pt-BR" : "en-US",
    { day: "2-digit", month: "long", year: "numeric" },
  );
}

// ---- i18n dictionaries ----------------------------------------------------

const T = {
  "pt-BR": {
    programme: "Amazing School · Programa de Inglês",
    cefrCaption:
      "Alinhado ao Common European Framework of Reference for Languages (CEFR)",
    mainTitle: "Certificado de Conclusão",
    subTitle: "Certificate of Completion",
    prelude: "Este documento certifica que",
    cefrBody: (level: string, levelTitle: string, classroom: string | null) =>
      `concluiu com êxito o nível ${level} — ${levelTitle}${classroom ? ` na turma ${classroom}` : ""}, cumprindo todas as avaliações e atividades previstas no período de`,
    customBody: (classroom: string | null) =>
      `concluiu com êxito o programa${classroom ? ` na turma ${classroom}` : ""}, cumprindo todas as avaliações e atividades previstas no período de`,
    connector: "a",
    hours: (h: number) => `Carga horária total: ${h} horas.`,
    gradeLabel: "Conceito",
    issuedOn: "Data de emissão",
    // Filled in dynamically below from teacher.fullName →
    // teacherTitle() so pt-BR certificates read "Professor
    // Responsável" or "Professora Responsável" correctly.
    responsible: "",
    certificateNumber: "Certificado nº",
  },
  en: {
    programme: "Amazing School · English Programme",
    cefrCaption:
      "Aligned with the Common European Framework of Reference for Languages (CEFR)",
    mainTitle: "Certificate of Completion",
    subTitle: "Certificado de Conclusão",
    prelude: "This is to certify that",
    cefrBody: (level: string, levelTitle: string, classroom: string | null) =>
      `has successfully completed the ${level} level — ${levelTitle}${classroom ? ` in the ${classroom} class` : ""}, fulfilling every assessment and activity required during the period from`,
    customBody: (classroom: string | null) =>
      `has successfully completed the programme${classroom ? ` in the ${classroom} class` : ""}, fulfilling every assessment and activity required during the period from`,
    connector: "to",
    hours: (h: number) => `Total workload: ${h} hours.`,
    gradeLabel: "Grade",
    issuedOn: "Issue date",
    responsible: "Teaching instructor",
    certificateNumber: "Certificate no.",
  },
} as const;

// ---- Metadata (filename) --------------------------------------------------

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const lang = readLang(sp.lang);
  const data = await getCertificate(id);
  if ("error" in data) return { title: "Certificate · Amazing School" };
  const lvl = findCertificateLevel(data.level);
  const baseParts = [
    lang === "pt-BR" ? "certificado" : "certificate",
    slugifyForFilename(data.student.fullName),
    lvl?.codeLabel ?? data.level,
    data.grade,
    lang === "pt-BR" ? "pt-br" : "en",
  ];
  return { title: reportFilename(baseParts) };
}

// ---- Page -----------------------------------------------------------------

export default async function CertificatePrintPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const autoprint = sp.autoprint === "1";
  const lang = readLang(sp.lang);
  const data = await getCertificate(id);
  if ("error" in data) notFound();

  const dict = T[lang];
  const lvl = findCertificateLevel(data.level);
  const grade = findGrade(data.grade);
  const isCustom = data.level === "custom";
  // Level label + description — language-dependent for CEFR, raw
  // text for custom certificates (teacher already wrote it).
  const levelCode = isCustom
    ? (data.title ?? "Custom")
    : (lvl?.codeLabel ?? data.level.toUpperCase());
  const levelDescription = isCustom
    ? ""
    : lang === "pt-BR"
      ? (lvl?.title ?? "")
      : (lvl?.en ?? "");

  const filename = reportFilename([
    lang === "pt-BR" ? "certificado" : "certificate",
    slugifyForFilename(data.student.fullName),
    lvl?.codeLabel ?? data.level,
    data.grade,
    lang === "pt-BR" ? "pt-br" : "en",
  ]);

  const uploadedTeacherLogo =
    data.teacher.schoolLogoEnabled && data.teacher.schoolLogoUrl
      ? schoolLogoPublicUrl(data.teacher.schoolLogoUrl)
      : null;
  const whitelistTeacherLogo =
    data.teacher.schoolLogoEnabled &&
    !uploadedTeacherLogo &&
    isLogoEligible(data.teacher.email ?? null, data.teacher.fullName ?? "")
      ? SCHOOL_LOGO_SRC
      : null;
  const teacherLogo = uploadedTeacherLogo ?? whitelistTeacherLogo;

  return (
    <>
      <PrintToolbar filename={filename} />
      <AutoPrint enabled={autoprint} />
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          .certificate-page { width: 100% !important; min-height: 0 !important; }
        }
      `}</style>

      <article
        className="certificate-page"
        style={{
          width: "1123px",
          minHeight: "794px",
          margin: "0 auto 1.25rem",
          background:
            "linear-gradient(135deg, #fffdf7 0%, #ffffff 50%, #faf6ec 100%)",
          color: "#0a0a0a",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.05), 0 8px 24px -6px rgba(0,0,0,0.18)",
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
          fontFamily:
            'var(--font-sans), "Helvetica Neue", Arial, sans-serif',
          padding: "28mm 26mm",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 18,
            border: "2px solid #a68a3e",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 26,
            border: "0.5px solid #a68a3e",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />

        <CornerFlourish style={{ top: 22, left: 22 }} rotation={0} />
        <CornerFlourish style={{ top: 22, right: 22 }} rotation={90} />
        <CornerFlourish style={{ bottom: 22, left: 22 }} rotation={-90} />
        <CornerFlourish style={{ bottom: 22, right: 22 }} rotation={180} />

        <header
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            paddingBottom: 16,
          }}
        >
          {/* LEFT — teacher's school logo (mirror copy on the right). */}
          <SchoolLogoSlot
            src={teacherLogo}
            alt={
              data.teacher.fullName
                ? `${data.teacher.fullName} — logo`
                : "School logo"
            }
          />

          <div style={{ textAlign: "center", flex: 1 }}>
            <p
              style={{
                fontSize: "10pt",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#6b5b24",
                fontWeight: 600,
              }}
            >
              {dict.programme}
            </p>
            {!isCustom ? (
              <p style={{ fontSize: "9pt", color: "#6b7280", marginTop: 2 }}>
                {dict.cefrCaption}
              </p>
            ) : null}
          </div>

          {/* RIGHT — teacher's school logo doubled for institutional
              symmetry. Amazing School mark moves to a dedicated band
              above the footer so the platform identity stays visible
              without competing with the teacher's brand up top. */}
          <SchoolLogoSlot
            src={teacherLogo}
            alt={
              data.teacher.fullName
                ? `${data.teacher.fullName} — logo`
                : "School logo"
            }
          />
        </header>

        <section
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display), "Georgia", serif',
              fontStyle: "italic",
              fontSize: "38pt",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              color: "#1f1a0f",
              margin: 0,
            }}
          >
            {dict.mainTitle}
          </h1>
          <p
            style={{
              marginTop: 4,
              fontSize: "11pt",
              color: "#6b5b24",
              fontStyle: "italic",
            }}
          >
            {dict.subTitle}
          </p>

          <p style={{ marginTop: 20, fontSize: "11pt", color: "#4b5563" }}>
            {dict.prelude}
          </p>

          <p
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-display), "Georgia", serif',
              fontStyle: "italic",
              fontSize: "28pt",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              color: "#0a0a0a",
              margin: "8px auto 0",
              maxWidth: "85%",
            }}
          >
            {data.student.fullName}
          </p>

          <div
            style={{
              width: 360,
              height: 1,
              background: "#c4a74e",
              margin: "10px auto",
            }}
          />

          <p
            style={{
              fontSize: "12pt",
              color: "#1f2937",
              lineHeight: 1.7,
              maxWidth: 780,
              margin: "12px auto 0",
            }}
          >
            {isCustom ? (
              <>
                {dict.customBody(data.student.classroomName)}{" "}
                <strong>{fmtLongDate(data.courseStartOn, lang)}</strong>{" "}
                {dict.connector}{" "}
                <strong>{fmtLongDate(data.courseEndOn, lang)}</strong>.{" "}
                <span style={{ display: "block", marginTop: 6 }}>
                  <strong style={{ fontSize: "13pt" }}>{levelCode}</strong>
                </span>
              </>
            ) : (
              <>
                {dict.cefrBody(
                  levelCode,
                  levelDescription,
                  data.student.classroomName,
                )}{" "}
                <strong>{fmtLongDate(data.courseStartOn, lang)}</strong>{" "}
                {dict.connector}{" "}
                <strong>{fmtLongDate(data.courseEndOn, lang)}</strong>.
              </>
            )}
          </p>

          {data.totalHours && data.totalHours > 0 ? (
            <p
              style={{
                marginTop: 6,
                fontSize: "11pt",
                color: "#6b5b24",
                fontWeight: 500,
              }}
            >
              {dict.hours(data.totalHours)}
            </p>
          ) : null}

          {data.title && !isCustom ? (
            <p
              style={{
                marginTop: 10,
                fontSize: "10.5pt",
                color: "#6b7280",
                fontStyle: "italic",
              }}
            >
              {data.title}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 22,
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 90,
                height: 90,
                borderRadius: "50%",
                border: "3px solid #c4a74e",
                background: `linear-gradient(135deg, ${grade?.color ?? "#111827"}15, #ffffff)`,
                color: grade?.color ?? "#111827",
                fontSize: "40pt",
                fontWeight: 700,
                fontFamily: 'var(--font-display), "Georgia", serif',
                lineHeight: 1,
                boxShadow: `0 0 0 4px ${grade?.color ?? "#111827"}10`,
              }}
            >
              {data.grade}
            </span>
            <span
              style={{
                fontSize: "9pt",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#6b5b24",
                fontWeight: 600,
              }}
            >
              {dict.gradeLabel} · {grade?.caption ?? ""}
            </span>
          </div>

        </section>

        {/* Remarks sit in the natural flow, right after the body.
            A flex spacer below pushes the footer + brand band to
            the bottom so long remarks can never overlap either. */}
        {data.remarks ? (
          <section
            style={{
              position: "relative",
              zIndex: 1,
              margin: "22px auto 0",
              maxWidth: 720,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "10.5pt",
                color: "#374151",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              &ldquo;{data.remarks}&rdquo;
            </p>
          </section>
        ) : null}

        {/* Flex spacer — whatever room is left between the last
            body section and the footer. Guarantees the signature
            block never rides up into the remarks / body. */}
        <div style={{ flex: 1, minHeight: 24 }} />

        <footer
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginTop: 12,
          }}
        >
          <div style={{ textAlign: "left", fontSize: "10pt", color: "#374151" }}>
            <p style={{ fontWeight: 600 }}>
              {fmtLongDate(data.courseEndOn, lang)}
            </p>
            <p style={{ color: "#6b7280", fontSize: "9pt" }}>
              {dict.issuedOn}
            </p>
          </div>

          <div style={{ textAlign: "center", minWidth: 260 }}>
            <div
              style={{
                height: 50,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {data.teacher.signatureEnabled && data.teacher.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.teacher.signatureUrl}
                  alt={`${data.teacher.fullName ?? "teacher"} signature`}
                  style={{
                    maxHeight: 46,
                    maxWidth: 240,
                    objectFit: "contain",
                  }}
                />
              ) : null}
            </div>
            <div
              style={{
                borderTop: "1px solid #9ca3af",
                paddingTop: 5,
                fontSize: "10pt",
                fontWeight: 600,
                color: "#0a0a0a",
              }}
            >
              {data.teacher.fullName ||
                data.teacher.email ||
                (lang === "pt-BR" ? "Professor(a)" : "Instructor")}
            </div>
            {/* Optional teacher credentials line — prints between
                the name and the responsible-teacher role. */}
            {data.teacherTitle ? (
              <p
                style={{
                  fontSize: "8.5pt",
                  color: "#4b5563",
                  marginTop: 1,
                  fontStyle: "italic",
                }}
              >
                {data.teacherTitle}
              </p>
            ) : null}
            <p style={{ fontSize: "9pt", color: "#6b7280", marginTop: 2 }}>
              {lang === "pt-BR"
                ? `${teacherTitle(inferGenderFromName(data.teacher.fullName))} Responsável`
                : "Teaching instructor"}
            </p>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: "9pt",
              color: "#6b7280",
              lineHeight: 1.4,
            }}
          >
            <p style={{ fontWeight: 600, color: "#374151" }}>
              {dict.certificateNumber}
            </p>
            <p style={{ fontFamily: "monospace" }}>
              {data.certificateNumber}
            </p>
          </div>
        </footer>

        {/* Amazing School brand band — LAST element of the article,
            sits at the real bottom of the page below the signature.
            The flex-column layout up top keeps everything else in
            place regardless of how long remarks / body runs. */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#ffffff",
              borderRadius: 999,
              padding: "3px 14px 3px 6px",
            }}
          >
            <AmazingSchoolMark size={16} />
            <span
              style={{
                fontSize: "8pt",
                color: "#6b5b24",
                letterSpacing: "0.04em",
                fontWeight: 500,
              }}
            >
              {lang === "pt-BR"
                ? "Emitido por Amazing School · amazing-school-app.vercel.app"
                : "Issued by Amazing School · amazing-school-app.vercel.app"}
            </span>
          </div>
        </div>
      </article>
    </>
  );
}

function SchoolLogoSlot({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  if (!src) return <div style={{ minWidth: 180 }} />;
  return (
    <div
      style={{
        height: 88,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        minWidth: 180,
      }}
    >
      {/* Bigger + borderless for certificates — matches the user
          ask to make the school logo elegant and prominent. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          maxHeight: 78,
          maxWidth: 220,
          width: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function CornerFlourish({
  style,
  rotation,
}: {
  style: React.CSSProperties;
  rotation: number;
}) {
  return (
    <svg
      aria-hidden
      width="52"
      height="52"
      viewBox="0 0 52 52"
      style={{
        position: "absolute",
        color: "#a68a3e",
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
    >
      <path
        d="M 6 6 L 20 6 M 6 6 L 6 20 M 10 10 L 16 16"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path d="M 26 6 L 30 10 L 26 14 L 22 10 Z" fill="currentColor" />
    </svg>
  );
}
