"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Charts tuned for print — fixed width/height (no ResponsiveContainer)
 * because Recharts' responsive sizing racing against window.print()
 * produces blank frames in the PDF. Colours come from a single palette
 * shared with the teacher dashboard so the reports feel of-a-piece.
 */

const PALETTE = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#a855f7", // violet
];

interface MonthlyBarsProps {
  data: Array<{ month: string; lessons: number; music: number }>;
  width?: number;
  height?: number;
}

export function MonthlyCompletionsChart({
  data,
  width = 700,
  height = 220,
}: MonthlyBarsProps) {
  // Use short month labels (e.g. "jan/25") so ticks fit a print page.
  const labelled = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));
  return (
    <BarChart
      width={width}
      height={height}
      data={labelled}
      margin={{ top: 8, right: 8, bottom: 4, left: -16 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#6b7280" />
      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="#6b7280" />
      <Tooltip
        contentStyle={{
          fontSize: 11,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
        }}
      />
      <Bar dataKey="lessons" stackId="a" fill={PALETTE[0]} name="Lições" />
      <Bar dataKey="music" stackId="a" fill={PALETTE[1]} name="Músicas" />
    </BarChart>
  );
}

interface CefrMixProps {
  data: Array<{ cefr: string; assigned: number; completed: number }>;
  width?: number;
  height?: number;
}

export function CefrMixChart({
  data,
  width = 320,
  height = 220,
}: CefrMixProps) {
  const pieData = data
    .filter((d) => d.assigned > 0)
    .map((d) => ({ name: d.cefr, value: d.assigned }));
  return (
    <PieChart width={width} height={height}>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        outerRadius={80}
        innerRadius={40}
        label={({ name, value }) => `${name}·${value}`}
        labelLine={false}
      >
        {pieData.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}

// -- Helpers ----------------------------------------------------------------

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-");
  const ptMonths = [
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
  const idx = Number(m) - 1;
  const mon = ptMonths[idx] ?? m;
  return `${mon}/${y.slice(2)}`;
}
