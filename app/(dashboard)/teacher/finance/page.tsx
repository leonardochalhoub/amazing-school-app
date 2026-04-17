import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherManagementMatrix } from "@/lib/actions/teacher-payments";
import { ManagementGrid } from "@/components/owner/management-grid";
import { RevenueAnalytics } from "@/components/owner/revenue-analytics";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
  CalendarClock,
  CircleDollarSign,
  Sigma,
} from "lucide-react";

const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

export default async function TeacherFinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/");

  const data = await getTeacherManagementMatrix({ months: 24 });
  if ("error" in data) {
    return <p className="py-12 text-center text-destructive">{data.error}</p>;
  }
  const { months, rows } = data;
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

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Teacher
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Your students&apos; monthly tuition. Set the rate + due day once;
          the grid auto-generates every month&apos;s invoice. Click the cell
          when the money arrives.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={`Paid — ${monthLabel(currentMonth)}`}
          value={BRL(revenueCentsMonth)}
          sub={`${paidCount} of ${rows.length} students`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <Kpi
          label={`Pending — ${monthLabel(currentMonth)}`}
          value={BRL(pendingCentsMonth)}
          sub={`${pendingCount} outstanding`}
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
        />
        <Kpi
          label="Monthly baseline"
          value={BRL(monthlyBaselineCents)}
          sub={`${activeStudents} active students`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <Kpi
          label="Last 24 months"
          value={BRL(revenueTrailing24Cents)}
          sub="All paid invoices combined"
          icon={<Sigma className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi
          label="Expected — next 6 months"
          value={BRL(expectedNext6Cents)}
          sub="At current baseline"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <Kpi
          label="Expected — next 24 months"
          value={BRL(expectedNext24Cents)}
          sub="At current baseline"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Kpi
          label="Avg tuition"
          value={
            activeStudents > 0
              ? BRL(Math.round(monthlyBaselineCents / activeStudents))
              : BRL(0)
          }
          sub="Across active students"
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
      </div>

      <RevenueAnalytics months={months} rows={rows} groupBy="student" />
      <ManagementGrid months={months} rows={rows} />
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
