"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ManagementRow } from "@/lib/payments-types";
import { useI18n } from "@/lib/i18n/context";

/**
 * Above this many slices the pie becomes noise — labels overlap, legend
 * explodes, and small contributors vanish visually. We swap to a sorted
 * horizontal bar at the same container size; each contributor gets a
 * readable row with their BRL value inline.
 */
const PIE_THRESHOLD = 8;

interface Props {
  months: string[]; // newest first
  rows: ManagementRow[];
  /**
   * Pie chart grouping axis. Owner view wants "teacher" (revenue share
   * across teachers); teacher finance view wants "student" (share across
   * their own students).
   */
  groupBy?: "teacher" | "student";
}

const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const PIE_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#0ea5e9",
];

function monthShort(iso: string, pt: boolean): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString(pt ? "pt-BR" : "en-US", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  });
}

export function RevenueAnalytics({
  months,
  rows,
  groupBy = "teacher",
}: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  // Oldest → newest, 24 buckets.
  const ordered = useMemo(() => [...months].slice(0, 24).reverse(), [months]);

  // Stacked bar: paid vs pending per month.
  const barData = useMemo(() => {
    return ordered.map((m) => {
      let paid = 0;
      let pending = 0;
      for (const r of rows) {
        const p = r.payments[m];
        if (!p) continue;
        const amount = p.amount_cents ?? r.monthly_tuition_cents ?? 0;
        if (p.paid) paid += amount;
        else pending += amount;
      }
      return {
        month: monthShort(m, pt),
        paid: paid / 100,
        pending: pending / 100,
      };
    });
  }, [rows, ordered, pt]);

  // Pie: revenue share (past 24 months, paid only) grouped by the selected axis.
  const pieData = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const r of rows) {
      const key = groupBy === "student" ? r.student_name : r.teacher_name;
      for (const m of ordered) {
        const p = r.payments[m];
        if (p?.paid) {
          const amt = p.amount_cents ?? r.monthly_tuition_cents ?? 0;
          bucket.set(key, (bucket.get(key) ?? 0) + amt);
        }
      }
    }
    return [...bucket.entries()]
      .map(([name, cents]) => ({ name, value: cents / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [rows, ordered, groupBy]);

  const useBarFallback = pieData.length > PIE_THRESHOLD;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-card p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">
          {pt
            ? "Receita por mês — últimos 24"
            : "Revenue by month — last 24"}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${Math.round(v)}`}
              />
              <Tooltip
                formatter={(v) => BRL(Math.round(Number(v) * 100))}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.1)",
                  fontSize: 12,
                }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="paid"
                stackId="a"
                fill="#10b981"
                name={pt ? "Pago" : "Paid"}
              />
              <Bar
                dataKey="pending"
                stackId="a"
                fill="#f59e0b"
                name={pt ? "Pendente" : "Pending"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">
          {pt
            ? groupBy === "student"
              ? "Receita por aluno"
              : "Receita por professor"
            : groupBy === "student"
              ? "Revenue share by student"
              : "Revenue share by teacher"}
        </h3>
        <div className="h-64">
          {pieData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {pt ? "Ainda sem receita registrada." : "No revenue recorded yet."}
            </p>
          ) : useBarFallback ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pieData}
                layout="vertical"
                margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${Math.round(v)}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip
                  formatter={(v) => BRL(Math.round(Number(v) * 100))}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  name={pt ? "Receita" : "Revenue"}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  label={(entry) =>
                    (entry as { name?: string }).name ?? ""
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => BRL(Math.round(Number(v) * 100))}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
