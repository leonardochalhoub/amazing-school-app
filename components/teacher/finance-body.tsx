"use client";

import {
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
  CalendarClock,
  CircleDollarSign,
  Sigma,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ManagementGrid } from "@/components/owner/management-grid";
import { RevenueAnalytics } from "@/components/owner/revenue-analytics";
import { useI18n } from "@/lib/i18n/context";
import type { ManagementRow } from "@/lib/actions/payments";

const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

function monthLabel(iso: string, locale: "en" | "pt-BR") {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    { month: "long", year: "numeric" }
  );
}

interface Props {
  months: string[];
  rows: ManagementRow[];
}

export function TeacherFinanceBody({ months, rows }: Props) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const currentMonth = months[0];

  let paidCount = 0;
  let pendingCount = 0;
  let revenueCentsMonth = 0;
  let pendingCentsMonth = 0;
  for (const r of rows) {
    const p = r.payments[currentMonth];
    if (!p) continue;
    const amount = p.amount_cents ?? r.monthly_tuition_cents ?? 0;
    if (p.paid) {
      paidCount += 1;
      revenueCentsMonth += amount;
    } else {
      pendingCount += 1;
      pendingCentsMonth += amount;
    }
  }

  let revenueTrailing24Cents = 0;
  for (const r of rows) {
    for (const m of months) {
      const p = r.payments[m];
      if (p?.paid) {
        revenueTrailing24Cents += p.amount_cents ?? r.monthly_tuition_cents ?? 0;
      }
    }
  }

  const monthlyBaselineCents = rows.reduce(
    (sum, r) => sum + (r.monthly_tuition_cents ?? 0),
    0
  );
  const activeStudents = rows.filter((r) => r.monthly_tuition_cents).length;
  const expectedNext6Cents = monthlyBaselineCents * 6;
  const expectedNext24Cents = monthlyBaselineCents * 24;

  const t = isPt
    ? {
        breadcrumb: "Professor",
        title: "Financeiro",
        desc: "Mensalidade dos seus alunos. Defina valor + dia de vencimento uma vez; a grade gera a cobrança todo mês. Clique na célula quando o pagamento chegar.",
        kpi_paid: (m: string) => `Recebido — ${m}`,
        kpi_pending: (m: string) => `Pendente — ${m}`,
        kpi_baseline: "Base mensal",
        kpi_trailing: "Últimos 24 meses",
        kpi_next6: "Previsto — próximos 6 meses",
        kpi_next24: "Previsto — próximos 24 meses",
        kpi_avg: "Mensalidade média",
        sub_paid: `${paidCount} de ${rows.length} alunos`,
        sub_pending: `${pendingCount} em aberto`,
        sub_baseline: `${activeStudents} alunos ativos`,
        sub_trailing: "Todas as faturas pagas somadas",
        sub_next: "No ritmo atual",
        sub_avg: "Entre alunos ativos",
      }
    : {
        breadcrumb: "Teacher",
        title: "Finance",
        desc: "Your students' monthly tuition. Set the rate + due day once; the grid auto-generates every month's invoice. Click the cell when the money arrives.",
        kpi_paid: (m: string) => `Paid — ${m}`,
        kpi_pending: (m: string) => `Pending — ${m}`,
        kpi_baseline: "Monthly baseline",
        kpi_trailing: "Last 24 months",
        kpi_next6: "Expected — next 6 months",
        kpi_next24: "Expected — next 24 months",
        kpi_avg: "Avg tuition",
        sub_paid: `${paidCount} of ${rows.length} students`,
        sub_pending: `${pendingCount} outstanding`,
        sub_baseline: `${activeStudents} active students`,
        sub_trailing: "All paid invoices combined",
        sub_next: "At current baseline",
        sub_avg: "Across active students",
      };

  const monthStr = monthLabel(currentMonth, locale);

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t.breadcrumb}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.desc}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi
          label={t.kpi_paid(monthStr)}
          value={BRL(revenueCentsMonth)}
          sub={t.sub_paid}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <Kpi
          label={t.kpi_pending(monthStr)}
          value={BRL(pendingCentsMonth)}
          sub={t.sub_pending}
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
        />
        <Kpi
          label={t.kpi_baseline}
          value={BRL(monthlyBaselineCents)}
          sub={t.sub_baseline}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Kpi
          label={t.kpi_trailing}
          value={BRL(revenueTrailing24Cents)}
          sub={t.sub_trailing}
          icon={<Sigma className="h-4 w-4" />}
        />
        <Kpi
          label={t.kpi_next6}
          value={BRL(expectedNext6Cents)}
          sub={t.sub_next}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <Kpi
          label={t.kpi_next24}
          value={BRL(expectedNext24Cents)}
          sub={t.sub_next}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Kpi
          label={t.kpi_avg}
          value={
            activeStudents > 0
              ? BRL(Math.round(monthlyBaselineCents / activeStudents))
              : BRL(0)
          }
          sub={t.sub_avg}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
      </div>

      <ManagementGrid months={months} rows={rows} />
      <RevenueAnalytics months={months} rows={rows} groupBy="student" />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div
          className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground ${toneClass}`}
        >
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>
          {value}
        </div>
        {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
