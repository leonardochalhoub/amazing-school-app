import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listTeacherReceipts } from "@/lib/actions/reports";
import { ReportShell } from "@/components/reports/report-shell";
import { BrandWatermark } from "@/components/reports/brand-watermark";
import { formatBRL } from "@/lib/reports/brl";
import { reportFilename } from "@/lib/reports/filename";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function monthLabel(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return `${MONTHS_PT[m - 1] ?? iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

interface PageProps {
  searchParams: Promise<{
    q?: string | string[];
    autoprint?: string | string[];
  }>;
}

function readQuery(raw: string | string[] | undefined): string {
  if (!raw) return "";
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v.trim();
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    title: reportFilename([
      "recibos",
      q ? q.slice(0, 40) : "todos",
      stamp,
    ]),
  };
}

export default async function ReceiptsListPrintPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const autoprint = sp.autoprint === "1";
  const receipts = await listTeacherReceipts();
  if (receipts.length === 0) notFound();

  // Apply the same filter logic the dialog uses — keep it identical
  // so the printed PDF always matches the on-screen preview.
  const filtered = q
    ? receipts.filter((r) => {
        const hay = `${r.studentName} ${r.classroomName ?? ""} ${monthLabel(
          r.billingMonth,
        )} ${formatBRL(r.amountCents)}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : receipts;

  // Pull the teacher brand separately (listTeacherReceipts doesn't
  // carry the school-logo toggle).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const admin = createAdminClient();
  const { data: teacherRow } = await admin
    .from("profiles")
    .select("full_name, school_logo_enabled, school_logo_url")
    .eq("id", user.id)
    .maybeSingle();
  const teacher = (teacherRow as {
    full_name: string | null;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
  } | null) ?? {
    full_name: null,
    school_logo_enabled: null,
    school_logo_url: null,
  };

  const totalCents = filtered.reduce((s, r) => s + r.amountCents, 0);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = reportFilename([
    "recibos",
    q ? q.slice(0, 40) : "todos",
    stamp,
  ]);

  return (
    <ReportShell
      filename={filename}
      autoPrint={autoprint}
      title="Recibos emitidos"
      subtitle={q ? `Filtro: "${q}"` : "Todos os pagamentos registrados"}
      teacher={{
        fullName: teacher.full_name,
        schoolLogoEnabled: teacher.school_logo_enabled,
        schoolLogoUrl: teacher.school_logo_url,
      }}
      footerLeft={teacher.full_name}
      meta={[
        {
          label: "Quantidade",
          value: String(filtered.length),
        },
        {
          label: "Total",
          value: formatBRL(totalCents),
        },
      ]}
    >
      <table className="mt-2">
        <thead>
          <tr>
            <th style={{ width: "34%" }}>Aluno</th>
            <th style={{ width: "18%" }}>Turma</th>
            <th style={{ width: "12%" }}>Mês</th>
            <th style={{ width: "14%", textAlign: "right" }}>Valor</th>
            <th style={{ width: "12%" }}>Pago em</th>
            <th style={{ width: "10%" }}>Nº</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            // Same algorithm used by the single-receipt page so a row
            // and its full receipt share the same number.
            const mo = r.billingMonth.slice(0, 7).replace("-", "");
            const suffix = r.paymentId.replace(/-/g, "").slice(0, 8).toUpperCase();
            const number = `AS-${mo}-${suffix}`;
            return (
              <tr key={r.paymentId}>
                <td style={{ fontWeight: 500 }}>{r.studentName}</td>
                <td className="report-muted">{r.classroomName ?? "—"}</td>
                <td style={{ textTransform: "capitalize" }}>
                  {monthLabel(r.billingMonth)}
                </td>
                <td style={{ textAlign: "right" }} className="tabular-nums">
                  {formatBRL(r.amountCents)}
                </td>
                <td className="report-muted">
                  {r.paidAt
                    ? new Date(r.paidAt).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>
                  {number}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ fontWeight: 600 }}>
              Total
            </td>
            <td
              style={{ textAlign: "right", fontWeight: 700 }}
              className="tabular-nums"
            >
              {formatBRL(totalCents)}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>

      <BrandWatermark tagline="Lista de recibos · Amazing School · amazing-school-app.vercel.app" />
    </ReportShell>
  );
}
