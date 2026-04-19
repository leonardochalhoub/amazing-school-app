"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

type GrowthPoint = { week: string; newAccounts: number; newLessons: number };
type EngagementPoint = { date: string; activeStudents: number };
type Slice = { level: string; count: number };

const LEVEL_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#10b981",
  "#0ea5e9",
];

type Props = {
  growth: GrowthPoint[];
  engagement: EngagementPoint[];
  levelMix: Slice[];
  lessonsPerCefr: Slice[];
  songsPerCefr: Slice[];
};

export function SysadminCharts({
  growth,
  engagement,
  levelMix,
  lessonsPerCefr,
  songsPerCefr,
}: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <ChartCard title="New accounts · last 12 weeks" subtitle="Weekly, starting Monday">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={growth} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="week"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ stroke: "#6366f1", strokeOpacity: 0.2 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="newAccounts"
              stroke="#6366f1"
              fill="url(#accGrad)"
              strokeWidth={2}
              name="New accounts"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Daily active students · last 30 days"
        subtitle="Unique students with any lesson or chat activity"
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={engagement} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="2 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="activeStudents"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Active students"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Students per CEFR level"
        subtitle="Roster-assigned levels"
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={levelMix}
              dataKey="count"
              nameKey="level"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={3}
              label={({ payload }) => {
                const p = payload as { level?: string } | undefined;
                return (p?.level ?? "").toUpperCase();
              }}
            >
              {levelMix.map((_, i) => (
                <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Catalog size by CEFR"
        subtitle="Lessons (blue) vs. Songs (pink) per level"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={mergeCatalogSlices(lessonsPerCefr, songsPerCefr)}
            margin={{ top: 6, right: 6, bottom: 0, left: -20 }}
          >
            <CartesianGrid strokeDasharray="2 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="level"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="lessons" fill="#6366f1" name="Lessons" radius={[4, 4, 0, 0]} />
            <Bar dataKey="songs" fill="#ec4899" name="Songs" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function mergeCatalogSlices(lessons: Slice[], songs: Slice[]) {
  const merged = new Map<string, { level: string; lessons: number; songs: number }>();
  for (const l of lessons)
    merged.set(l.level, { level: l.level, lessons: l.count, songs: 0 });
  for (const s of songs) {
    const e = merged.get(s.level) ?? { level: s.level, lessons: 0, songs: 0 };
    e.songs = s.count;
    merged.set(s.level, e);
  }
  return [...merged.values()].sort((a, b) => a.level.localeCompare(b.level));
}
