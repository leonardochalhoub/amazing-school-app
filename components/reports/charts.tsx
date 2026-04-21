"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Two distinct palettes so the bar chart and the pie never share a
// hue — otherwise viewers mistake "Lições" (bar series) for "A1"
// (pie slice) at a glance.
const BAR_PALETTE = [
  "#6366f1", // indigo — Lições
  "#ec4899", // pink   — Músicas
];

const PIE_PALETTE = [
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#a855f7", // violet
  "#ef4444", // red
  "#f97316", // orange
];

interface MonthlyBarsProps {
  data: Array<{
    month: string;
    lessons: number;
    music: number;
    live?: number;
  }>;
  width?: number;
  height?: number;
}

export function MonthlyCompletionsChart({
  data,
  width = 700,
  height = 220,
}: MonthlyBarsProps) {
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
      <Legend
        wrapperStyle={{ fontSize: 10 }}
        iconType="square"
        iconSize={10}
      />
      <Bar dataKey="lessons" stackId="a" fill={BAR_PALETTE[0]} name="Lições" />
      <Bar dataKey="music" stackId="a" fill={BAR_PALETTE[1]} name="Músicas" />
      <Bar
        dataKey="live"
        stackId="a"
        fill="#10b981"
        name="Aulas ao vivo"
      />
    </BarChart>
  );
}

interface CefrMixProps {
  data: Array<{ cefr: string; assigned: number; completed: number }>;
  /** Total chart width — the pie takes the left half, the custom
      legend takes the right. */
  width?: number;
  height?: number;
}

/**
 * Custom-legend donut. Stopped relying on Recharts' built-in Legend
 * because the typing wouldn't let us inject per-slice % + count. The
 * wrapper renders a small table to the right: color swatch ·
 * label · count · percent. Labels directly on the slices stay as
 * "LEVEL · PCT%" so the chart is self-describing even if the legend
 * gets clipped at print size.
 */
export function CefrMixChart({
  data,
  width = 360,
  height = 220,
}: CefrMixProps) {
  const pieData = data
    .filter((d) => d.assigned > 0)
    .map((d) => ({
      name: d.cefr || "—",
      value: d.assigned,
    }));
  const total = pieData.reduce((s, d) => s + d.value, 0) || 1;

  const pieWidth = Math.max(180, Math.floor(width * 0.55));
  const legendWidth = Math.max(140, width - pieWidth - 12);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width,
      }}
    >
      <PieChart width={pieWidth} height={height}>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={Math.min(85, Math.floor(height / 2) - 16)}
          innerRadius={Math.min(42, Math.floor(height / 2) - 50)}
          label={({ name, percent, value }) => {
            const pct =
              typeof percent === "number"
                ? Math.round(percent * 100)
                : Math.round(((value as number) / total) * 100);
            return `${name} · ${pct}%`;
          }}
          labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
      <ul
        aria-label="Legenda"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          fontSize: 11,
          width: legendWidth,
          display: "grid",
          gap: 4,
        }}
      >
        {pieData.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <li
              key={d.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                lineHeight: 1.25,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: PIE_PALETTE[i % PIE_PALETTE.length],
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  minWidth: 28,
                }}
              >
                {d.name}
              </span>
              <span
                style={{
                  color: "#6b7280",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.value} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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
