import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceReceiptForPrint } from "@/lib/actions/service-receipts";
import { AutoPrint } from "@/components/reports/auto-print";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { ReportFooter } from "@/components/reports/report-footer";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { formatBRL, amountInWordsBRL } from "@/lib/reports/brl";
import { reportFilename, slugifyForFilename } from "@/lib/reports/filename";
import {
  schoolLogoPublicUrl,
  SCHOOL_LOGO_SRC,
  isLogoEligible,
} from "@/lib/school-logo";
import { AmazingSchoolMark } from "@/components/reports/amazing-school-mark";
import {
  inferGenderFromName,
  teacherTitle,
} from "@/lib/reports/gendered-titles";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getServiceReceiptForPrint(id);
  if ("error" in data) return { title: "Recibo · Amazing School" };
  const filename = reportFilename([
    "recibo-servico",
    slugifyForFilename(data.clientName),
    data.issuedOn,
    data.receiptNumber,
  ]);
  return { title: filename };
}

export default async function ServiceReceiptPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getServiceReceiptForPrint(id);
  if ("error" in data) notFound();
  const autoprint = sp.autoprint === "1";

  const filename = reportFilename([
    "recibo-servico",
    slugifyForFilename(data.clientName),
    data.issuedOn,
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

  const amountText = formatBRL(data.amountCents);
  const amountWords = amountInWordsBRL(data.amountCents);
  const issuedLabel = new Date(data.issuedOn).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const teacherName =
    data.teacher.fullName ||
    (data.teacher.email ? data.teacher.email.split("@")[0] : null) ||
    "o professor responsável";

  return (
    <>
      <PrintToolbar filename={filename} />
      <AutoPrint enabled={autoprint} />
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
                />
              </div>
            ) : null}
            <div>
              <h1 className="report-title" style={{ fontSize: "16pt" }}>
                Recibo de Serviço
              </h1>
              <p className="report-subtitle">Nº {data.receiptNumber}</p>
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
            <div className="report-logo-box" style={{ paddingInline: 10 }}>
              <AmazingSchoolMark size={22} />
            </div>
            <div className="report-meta">
              <div>
                <span className="report-muted">Valor: </span>
                <strong style={{ fontSize: "13pt" }}>{amountText}</strong>
              </div>
              <div>
                <span className="report-muted">Data: </span>
                <span>{issuedLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <section style={{ lineHeight: 1.7, fontSize: "11.5pt" }}>
          <p>
            Eu,{" "}
            <strong>
              {teacherName}
            </strong>
            , declaro que recebi de{" "}
            <strong>{data.clientName}</strong>
            {data.clientCpf ? (
              <span className="report-muted"> (CPF {data.clientCpf})</span>
            ) : null}{" "}
            a importância de <strong>{amountText}</strong>{" "}
            (<em style={{ textTransform: "lowercase" }}>{amountWords}</em>),
            referente ao serviço de{" "}
            <strong>{data.description}</strong>
            {data.notes ? (
              <>
                , {data.notes}
              </>
            ) : null}
            .
          </p>

          <p style={{ marginTop: 14 }}>
            Para clareza e validade, firmo o presente recibo.
          </p>
        </section>

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
              Emitido em
            </p>
            <p style={{ fontWeight: 600 }}>{issuedLabel}</p>
          </div>
          <div>
            <p className="report-muted" style={{ fontSize: "8pt" }}>
              Serviço
            </p>
            <p style={{ fontWeight: 600 }}>
              {data.description.slice(0, 50)}
              {data.description.length > 50 ? "…" : ""}
            </p>
          </div>
        </section>

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
                  style={{
                    maxHeight: 50,
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
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
              <span style={{ fontWeight: 600 }}>{teacherName}</span>
              <br />
              <span className="report-muted">
                {teacherTitle(inferGenderFromName(data.teacher.fullName))}{" "}
                Responsável
              </span>
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
              <span style={{ fontWeight: 600 }}>{data.clientName}</span>
              <br />
              <span className="report-muted">Quem pagou</span>
            </div>
          </div>
        </section>

        <BrandWatermark tagline="Recibo emitido por Amazing School · amazing-school-app.vercel.app" />

        <ReportFooter
          generatedAt={new Date().toISOString()}
          left={data.teacher.fullName ?? undefined}
        />
      </article>
    </>
  );
}
