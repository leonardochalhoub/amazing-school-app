import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth/roles";
import { getManagementMatrix } from "@/lib/actions/payments";
import { ManagementGrid } from "@/components/owner/management-grid";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, DollarSign } from "lucide-react";

export default async function ManagementPage() {
  const owner = await isOwner();
  if (!owner) redirect("/");

  const data = await getManagementMatrix({ months: 12 });
  if ("error" in data) {
    return <p className="py-12 text-center text-destructive">{data.error}</p>;
  }

  const currentMonth = data.months[0];
  const totalStudents = data.rows.length;
  let paidThisMonth = 0;
  let pendingThisMonth = 0;
  let revenueCents = 0;
  for (const r of data.rows) {
    const p = r.payments[currentMonth];
    if (p?.paid) {
      paidThisMonth += 1;
      revenueCents += p.amount_cents ?? 0;
    } else {
      pendingThisMonth += 1;
    }
  }

  const [yy, mm] = currentMonth.split("-");
  const currentMonthLabel = new Date(
    Number(yy),
    Number(mm) - 1,
    1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Owner
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Management</h1>
        <p className="text-sm text-muted-foreground">
          Monthly tuition tracking across every teacher and student.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Students"
          value={totalStudents.toString()}
          icon={<Users className="h-4 w-4" />}
        />
        <Kpi
          label={`Paid (${currentMonthLabel})`}
          value={paidThisMonth.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <Kpi
          label={`Pending (${currentMonthLabel})`}
          value={pendingThisMonth.toString()}
          icon={<Clock className="h-4 w-4" />}
        />
        <Kpi
          label={`Revenue (${currentMonthLabel})`}
          value={formatBrl(revenueCents)}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <ManagementGrid months={data.months} rows={data.rows} />
    </div>
  );
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
