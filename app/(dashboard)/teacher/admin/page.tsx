import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherDashboardData } from "@/lib/actions/teacher-dashboard";
import { getTeacherManagementMatrix } from "@/lib/actions/teacher-payments";
import { listTeacherListeningResponses } from "@/lib/actions/listening-responses";
import { getTeacherAiChatStats } from "@/lib/actions/teacher-ai-chat";
import { AiChatStatsTable } from "@/components/teacher/ai-chat-stats-table";
import { listDeletedRosterStudents } from "@/lib/actions/roster";
import { DeletedStudentsPanel } from "@/components/teacher/deleted-students-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  KpiTile,
  compactBRL,
  fullBRL,
  compactNumber,
} from "@/components/teacher/kpi-tile";
import { ManagementGrid } from "@/components/owner/management-grid";
import { RevenueAnalytics } from "@/components/owner/revenue-analytics";
import { TeacherReportsPanel } from "@/components/reports/teacher-reports-panel";
import { listTeacherReceipts } from "@/lib/actions/reports";
import {
  Users,
  Flame,
  Trophy,
  BookOpen,
  CheckCircle2,
  Headphones,
  ArrowRight,
  School,
  Sparkles,
  Wallet,
  Clock,
  AlertTriangle,
  Sigma,
  TrendingUp,
  CircleDollarSign,
  CalendarClock,
} from "lucide-react";
import { isTeacherRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function TeacherManagementPage() {
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
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/");

  const [
    dashboardData,
    financeData,
    listeningResponses,
    aiChatStats,
    deletedStudents,
    receiptsForQuery,
  ] = await Promise.all([
    getTeacherDashboardData(),
    getTeacherManagementMatrix({ months: 24 }),
    listTeacherListeningResponses(),
    getTeacherAiChatStats(),
    listDeletedRosterStudents(),
    listTeacherReceipts(),
  ]);

  const financeAvailable = !("error" in financeData);
  const finance =
    !("error" in financeData)
      ? financeData
      : { months: [], rows: [] as [] };
  const months = finance.months;
  const rows = finance.rows;
  const currentMonth = months[0];

  // -------- Finance aggregates --------
  let paidCount = 0;
  let pendingCount = 0;
  let paidCentsMonth = 0;
  let pendingCentsMonth = 0;
  for (const r of rows) {
    const p = r.payments[currentMonth];
    if (!p) continue;
    const amt = p.amount_cents ?? r.monthly_tuition_cents ?? 0;
    if (p.paid) {
      paidCount += 1;
      paidCentsMonth += amt;
    } else {
      pendingCount += 1;
      pendingCentsMonth += amt;
    }
  }
  let revenueTrailing12Cents = 0;
  const last12 = months.slice(0, 12);
  for (const r of rows) {
    for (const m of last12) {
      const p = r.payments[m];
      if (p?.paid) revenueTrailing12Cents += p.amount_cents ?? r.monthly_tuition_cents ?? 0;
    }
  }
  // Debt = sum of unpaid invoices OLDER than the current billing month.
  let debtCentsTotal = 0;
  const studentsInDebt = new Set<string>();
  for (const r of rows) {
    for (const m of months.slice(1)) {
      const p = r.payments[m];
      if (p && !p.paid) {
        debtCentsTotal += p.amount_cents ?? r.monthly_tuition_cents ?? 0;
        studentsInDebt.add(r.roster_student_id);
      }
    }
  }
  const monthlyBaselineCents = rows.reduce(
    (s, r) => s + (r.monthly_tuition_cents ?? 0),
    0,
  );
  const activeTuitionSeats = rows.filter((r) => r.monthly_tuition_cents).length;
  const avgTuitionCents =
    activeTuitionSeats > 0
      ? Math.round(monthlyBaselineCents / activeTuitionSeats)
      : 0;

  const students = [...dashboardData.students].sort(
    (a, b) => b.totalXp - a.totalXp,
  );
  const pendingResponses = listeningResponses.filter((r) => !r.reviewed_at);
  const monthLabel = currentMonth
    ? new Date(
        Number(currentMonth.slice(0, 4)),
        Number(currentMonth.slice(5, 7)) - 1,
        1,
      ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Teacher
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Management</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your command centre — people on the left, money on the right. Set
            tuition once, click a cell when the payment lands, and watch the
            cohort breathe day by day.
          </p>
        </div>
      </header>

      {/* ========== REPORTS ========== */}
      <TeacherReportsPanel
        seedDates={[
          ...rows.map((r) => r.roster_created_at),
          ...rows.map((r) => r.billing_starts_on),
          ...months,
        ]}
        receipts={receiptsForQuery}
      />

      {/* ========== PEOPLE & LEARNING ========== */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            People &amp; Learning
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Live from the last 7 days
          </p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label="Students"
            value={compactNumber(dashboardData.kpis.totalStudents)}
            fullValue={String(dashboardData.kpis.totalStudents)}
            sub={`${dashboardData.kpis.totalClassrooms} classrooms`}
            icon={<Users className="h-3.5 w-3.5" />}
            tone="indigo"
          />
          <KpiTile
            label="Active today"
            value={compactNumber(dashboardData.kpis.activeToday)}
            fullValue={String(dashboardData.kpis.activeToday)}
            sub={
              dashboardData.kpis.totalStudents > 0
                ? `${Math.round(
                    (dashboardData.kpis.activeToday /
                      dashboardData.kpis.totalStudents) *
                      100,
                  )}% of cohort`
                : undefined
            }
            icon={<Flame className="h-3.5 w-3.5" />}
            tone="rose"
          />
          <KpiTile
            label="Avg streak"
            value={dashboardData.kpis.avgStreak.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            sub="days / student"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            tone="amber"
          />
          <KpiTile
            label="Lessons / week"
            value={compactNumber(dashboardData.kpis.lessonsThisWeek)}
            fullValue={String(dashboardData.kpis.lessonsThisWeek)}
            sub="completed"
            icon={<BookOpen className="h-3.5 w-3.5" />}
            tone="sky"
          />
          <KpiTile
            label="XP / week"
            value={compactNumber(dashboardData.kpis.xpThisWeek)}
            fullValue={String(dashboardData.kpis.xpThisWeek)}
            sub="earned across cohort"
            icon={<Trophy className="h-3.5 w-3.5" />}
            tone="violet"
          />
          <KpiTile
            label="Listening to review"
            value={compactNumber(pendingResponses.length)}
            fullValue={String(pendingResponses.length)}
            sub={`of ${listeningResponses.length} submissions`}
            icon={<Headphones className="h-3.5 w-3.5" />}
            tone={pendingResponses.length > 0 ? "amber" : "emerald"}
          />
        </div>
      </section>

      {/* ========== FINANCE ========== */}
      {financeAvailable ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money this month · {monthLabel}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Everything below stays private — only you see it.
            </p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              label="Paid"
              value={compactBRL(paidCentsMonth)}
              fullValue={fullBRL(paidCentsMonth)}
              sub={`${paidCount} of ${rows.length} students`}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              tone="emerald"
            />
            <KpiTile
              label="Pending"
              value={compactBRL(pendingCentsMonth)}
              fullValue={fullBRL(pendingCentsMonth)}
              sub={`${pendingCount} outstanding`}
              icon={<Clock className="h-3.5 w-3.5" />}
              tone="amber"
            />
            <KpiTile
              label="Debt (past due)"
              value={compactBRL(debtCentsTotal)}
              fullValue={fullBRL(debtCentsTotal)}
              sub={`${studentsInDebt.size} student${studentsInDebt.size === 1 ? "" : "s"}`}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone={debtCentsTotal > 0 ? "rose" : "emerald"}
            />
            <KpiTile
              label="Monthly baseline"
              value={compactBRL(monthlyBaselineCents)}
              fullValue={fullBRL(monthlyBaselineCents)}
              sub={`${activeTuitionSeats} active seats`}
              icon={<Wallet className="h-3.5 w-3.5" />}
            />
            <KpiTile
              label="Revenue · 12 mo"
              value={compactBRL(revenueTrailing12Cents)}
              fullValue={fullBRL(revenueTrailing12Cents)}
              sub="Paid invoices, trailing"
              icon={<Sigma className="h-3.5 w-3.5" />}
              tone="indigo"
            />
            <KpiTile
              label="Avg tuition"
              value={compactBRL(avgTuitionCents)}
              fullValue={fullBRL(avgTuitionCents)}
              sub="Across active seats"
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Projection row — only shown when a baseline exists */}
          {monthlyBaselineCents > 0 ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-2">
              <KpiTile
                label="Expected · next 6 months"
                value={compactBRL(monthlyBaselineCents * 6)}
                fullValue={fullBRL(monthlyBaselineCents * 6)}
                sub="Straight-line projection"
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                tone="sky"
              />
              <KpiTile
                label="Expected · next 24 months"
                value={compactBRL(monthlyBaselineCents * 24)}
                fullValue={fullBRL(monthlyBaselineCents * 24)}
                sub="Straight-line projection"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                tone="violet"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ========== Listening review callout ========== */}
      {pendingResponses.length > 0 ? (
        <section className="space-y-3">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {pendingResponses.length} listening response
                    {pendingResponses.length === 1 ? "" : "s"} waiting for you
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Review and leave feedback so the student can move on.
                  </p>
                </div>
              </div>
              <Link
                href="/teacher/listening-responses"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                Review now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* ========== Finance matrix ========== */}
      {financeAvailable && rows.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tuition matrix
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any cell to toggle paid / pending. Future months appear
              automatically at every billing day.
            </p>
          </div>
          <ManagementGrid months={months} rows={rows} />
        </section>
      ) : null}

      {/* ========== Revenue chart ========== */}
      {financeAvailable && rows.length > 0 ? (
        <RevenueAnalytics months={months} rows={rows} groupBy="student" />
      ) : null}

      {/* ========== Top students by XP ========== */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top students by XP
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Classroom</th>
                <th className="px-4 py-2 text-right">XP</th>
                <th className="px-4 py-2 text-right">Lessons</th>
                <th className="px-4 py-2 text-right">Streak</th>
                <th className="px-4 py-2 text-right">Last active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/teacher/students/${s.studentId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.classroomName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.totalXp.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.completed}/{s.assigned}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.streak}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {s.lastActivity ? s.lastActivity.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No students yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========== AI tutor usage ========== */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI tutor — per-student usage
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Scoped to your classrooms · sorted by messages · user-role
            only
          </p>
        </div>
        <AiChatStatsTable rows={aiChatStats} />
      </section>

      {/* ========== Classrooms ========== */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Classrooms
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {dashboardData.classrooms.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-primary" />
                  <p className="truncate font-medium">{c.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.studentCount} student{c.studentCount === 1 ? "" : "s"} ·
                  invite{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                    {c.inviteCode}
                  </code>
                </p>
              </CardContent>
            </Card>
          ))}
          {dashboardData.classrooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classrooms yet. Create your first one from the dashboard.
            </p>
          ) : null}
        </div>
      </section>

      {/* ========== Deleted students archive ========== */}
      <DeletedStudentsPanel entries={deletedStudents} />
    </div>
  );
}