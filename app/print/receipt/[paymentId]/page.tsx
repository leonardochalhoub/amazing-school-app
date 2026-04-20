import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReceiptData } from "@/lib/actions/reports";
import { AutoPrint } from "@/components/reports/auto-print";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { ReportFooter } from "@/components/reports/report-footer";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { formatBRL, amountInWordsBRL } from "@/lib/reports/brl";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";
import { schoolLogoPublicUrl, SCHOOL_LOGO_SRC, isLogoEligible } from "@/lib/school-logo";
import { AmazingSchoolMark } from "@/components/reports/amazing-school-mark";

export const dynamic = "force-dynamic";

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthNameFromISO(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return `${MONTHS_PT[m - 1] ?? iso.slice(5, 7)} de ${iso.slice(0, 4)}`;
}

interface PageProps {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ autoprint?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { paymentId } = await params;
  const data = await getReceiptData(paymentId);
  if ("error" in data) return { title: "Recibo · Amazing School" };
  const filename = reportFilename([
    "recibo",
    slugifyForFilename(data.student.fullName),
    data.payment.billingMonth.slice(0, 7),
    data.receiptNumber,
  ]);
  return { title: filename };
}

export default async function ReceiptPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { paymentId } = await params;
  const sp = await searchParams;
  const data = await getReceiptData(paymentId);
  if ("error" in data) notFound();
  const autoprint = sp.autoprint === "1";

  const filename = reportFilename([
    "recibo",
    slugifyForFilename(data.student.fullName),
    data.payment.billingMonth.slice(0, 7),
    data.receiptNumber,
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

  const monthLabel = monthNameFromISO(data.payment.billingMonth);
  const amountText = formatBRL(data.payment.amountCents);
  const amountWords = amountInWordsBRL(data.payment.amountCents);
  const paidAt = data.payment.paidAt
    ? new Date(data.payment.paidAt).toLocaleDateString("pt-BR")
    : new Date(data.generatedAt).toLocaleDateString("pt-BR");

  return (
    <>
      <PrintToolbar filename={filename} />
      <AutoPrint enabled={autoprint} />
      {/* Receipts are intentionally compact — roughly half an A4 page
          so a single paid invoice doesn't waste paper. The .report-page
          layout is reused for visual consistency with other reports. */}
      <article
        className="report-page"
        style={{
          minHeight: "auto",
          paddingTop: "20mm",
          paddingBottom: "20mm",
        }}
      >
        <header className="report-header" style={{ marginBottom: 16 }}>
          <div className="report-header-left">
            {teacherLogo ? (
              <div className="report-logo-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={teacherLogo}
                  alt={
                    data.teacher.fullName
                      ? `${data.teacher.fullName} — logo`
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
            <div>
              <h1 className="report-title" style={{ fontSize: "16pt" }}>
                Recibo
              </h1>
              <p className="report-subtitle">Nº {data.receiptNumber}</p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <AmazingSchoolMark size={22} />
            <div className="report-meta">
              <div>
                <span className="report-muted">Valor: </span>
                <strong style={{ fontSize: "13pt" }}>{amountText}</strong>
              </div>
              <div>
                <span className="report-muted">Referente a: </span>
                <span style={{ textTransform: "capitalize" }}>{monthLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Formal body — single declaration paragraph, standard for a
            Brazilian recibo. Keeps the document legally recognisable. */}
        <section style={{ lineHeight: 1.7, fontSize: "11.5pt" }}>
          <p>
            Eu,{" "}
            <strong>{data.teacher.fullName || data.teacher.email || "—"}</strong>
            {data.teacher.email ? (
              <span className="report-muted"> ({data.teacher.email})</span>
            ) : null}
            , declaro que recebi de{" "}
            <strong>{data.student.fullName}</strong>
            {data.student.classroomName ? (
              <span className="report-muted">
                {" "}
                — turma {data.student.classroomName}
              </span>
            ) : null}{" "}
            a importância de <strong>{amountText}</strong>{" "}
            (<em style={{ textTransform: "lowercase" }}>{amountWords}</em>),
            referente à mensalidade de{" "}
            <strong style={{ textTransform: "capitalize" }}>{monthLabel}</strong>
            , pelos serviços de aulas de inglês prestados através da plataforma
            Amazing School.
          </p>

          <p style={{ marginTop: 14 }}>
            Para clareza e validade, firmo o presente recibo.
          </p>
        </section>

        {/* Metadata grid — receipt number, dates, identifiers */}
        <section
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            fontSize: "9.5pt",
          }}
          className="report-avoid-break"
        >
          <div>
            <p className="report-muted" style={{ fontSize: "8pt" }}>
              Número do recibo
            </p>
            <p style={{ fontWeight: 600 }}>{data.receiptNumber}</p>
          </div>
          <div>
            <p className="report-muted" style={{ fontSize: "8pt" }}>
              Pagamento confirmado em
            </p>
            <p style={{ fontWeight: 600 }}>{paidAt}</p>
          </div>
          <div>
            <p className="report-muted" style={{ fontSize: "8pt" }}>
              Forma / referência
            </p>
            <p style={{ fontWeight: 600 }}>
              {data.payment.notes
                ? data.payment.notes.slice(0, 40)
                : "Mensalidade regular"}
            </p>
          </div>
        </section>

        {/* Signature block — teacher side can carry the digitised
            signature image when the teacher opted in; otherwise only
            the printed name is shown. */}
        <section
          style={{
            marginTop: 42,
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
          }}
          className="report-avoid-break"
        >
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                height: 56,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {data.teacher.signatureEnabled && data.teacher.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.teacher.signatureUrl}
                  alt={`Assinatura de ${data.teacher.fullName ?? "professor"}`}
                  style={{ maxHeight: 50, maxWidth: "100%", objectFit: "contain" }}
                />
              ) : null}
            </div>
            <div
              style={{
                borderTop: "1px solid #9ca3af",
                paddingTop: 6,
                fontSize: "9.5pt",
              }}
            >
              {data.teacher.fullName || data.teacher.email || "Professor(a)"}
              <br />
              <span className="report-muted">Quem recebeu</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 56 }} />
            <div
              style={{
                borderTop: "1px solid #9ca3af",
                paddingTop: 6,
                fontSize: "9.5pt",
              }}
            >
              {data.student.fullName}
              <br />
              <span className="report-muted">Quem pagou</span>
            </div>
          </div>
        </section>

        <BrandWatermark tagline="Recibo emitido por Amazing School · amazing-school-app.vercel.app" />

        <ReportFooter
          generatedAt={data.generatedAt}
          left={data.teacher.fullName || data.teacher.email}
        />
      </article>
    </>
  );
}
