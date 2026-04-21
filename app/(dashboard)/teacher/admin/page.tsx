import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherDashboardData } from "@/lib/actions/teacher-dashboard";
import { getTeacherManagementMatrix } from "@/lib/actions/teacher-payments";
import { listTeacherListeningResponses } from "@/lib/actions/listening-responses";
import { getTeacherAiChatStats } from "@/lib/actions/teacher-ai-chat";
import { AiChatStatsTable } from "@/components/teacher/ai-chat-stats-table";
import { getTeacherSpeakingStats } from "@/lib/actions/speaking-events";
import { SpeakingStatsTable } from "@/components/teacher/speaking-stats-table";
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
import { CertificatesSection } from "@/components/reports/certificates-section";
import { ServiceReceiptsSection } from "@/components/reports/service-receipts-section";
import { listTeacherReceipts } from "@/lib/actions/reports";
import { listCertificatesForTeacher } from "@/lib/actions/certificates";
import { listServiceReceiptsForTeacher } from "@/lib/actions/service-receipts";
import { T } from "@/components/reports/t";
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
    speakingStats,
    deletedStudents,
    receiptsForQuery,
    certificatesForTeacher,
    serviceReceipts,
  ] = await Promise.all([
    getTeacherDashboardData(),
    getTeacherManagementMatrix({ months: 24 }),
    listTeacherListeningResponses(),
    getTeacherAiChatStats(),
    getTeacherSpeakingStats().catch(() => []),
    listDeletedRosterStudents(),
    listTeacherReceipts(),
    listCertificatesForTeacher(),
    listServiceReceiptsForTeacher(),
  ]);

  const financeAvailable = !("error" in financeData);
  const finance =
    !("error" in financeData)
      ? financeData
      : { months: [], rows: [] as [] };
  const months = finance.months;
  const rows = finance.rows;
  // "Current month" for the Money-this-month KPI means the actual
  // calendar month on the wall clock — NOT months[0]. The finance
  // matrix extends one month past today so teachers can mark next
  // month's cells in advance; that last column is "next month",
  // not the month we KPI against.
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-01`;

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
  // Trailing-revenue aggregates — compute the 6- and 12-month
  // windows ending on the CURRENT calendar month (inclusive).
  // The finance matrix is DESC and leaks one month past today
  // (for advance marking), so we exclude anything after
  // currentMonth before summing.
  const pastMonths = months.filter((m) => m <= currentMonth);
  const last6 = pastMonths.slice(0, 6);
  const last12 = pastMonths.slice(0, 12);
  let revenueTrailing6Cents = 0;
  let revenueTrailing12Cents = 0;
  for (const r of rows) {
    for (const m of last12) {
      const p = r.payments[m];
      if (!p?.paid) continue;
      const amt = p.amount_cents ?? r.monthly_tuition_cents ?? 0;
      revenueTrailing12Cents += amt;
      if (last6.includes(m)) revenueTrailing6Cents += amt;
    }
  }
  // Debt = unpaid invoices strictly OLDER than the current calendar
  // month. The old code used months.slice(1) which worked when
  // months[0] was current, but now the matrix leaks one month past
  // today for advance marking — slice(1) started AT the current
  // month and counted it as past-due, inflating the debt KPI.
  let debtCentsTotal = 0;
  const studentsInDebt = new Set<string>();
  for (const r of rows) {
    for (const m of months) {
      if (m >= currentMonth) continue;
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
      ).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <T en="Teacher" pt="Professor" />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <T en="Management" pt="Gestão" />
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            <T
              en="Your command centre — people on the left, money on the right. Set tuition once, click a cell when the payment lands, and watch the cohort breathe day by day."
              pt="Seu centro de comando — pessoas à esquerda, dinheiro à direita. Defina a mensalidade uma vez, clique em uma célula quando o pagamento chegar, e acompanhe a turma respirar dia a dia."
            />
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
            <T en="People & Learning" pt="Pessoas & Aprendizado" />
          </h2>
          <p className="text-[11px] text-muted-foreground">
            <T
              en="Live from the last 7 days"
              pt="Dados ao vivo dos últimos 7 dias"
            />
          </p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label={<T en="Students" pt="Alunos" />}
            value={compactNumber(dashboardData.kpis.totalStudents)}
            fullValue={String(dashboardData.kpis.totalStudents)}
            sub={
              <T
                en={`${dashboardData.kpis.totalClassrooms} classrooms`}
                pt={`${dashboardData.kpis.totalClassrooms} turmas`}
              />
            }
            icon={<Users className="h-3.5 w-3.5" />}
            tone="indigo"
          />
          <KpiTile
            label={<T en="Active today" pt="Ativos hoje" />}
            value={compactNumber(dashboardData.kpis.activeToday)}
            fullValue={String(dashboardData.kpis.activeToday)}
            sub={
              dashboardData.kpis.totalStudents > 0 ? (
                <T
                  en={`${Math.round(
                    (dashboardData.kpis.activeToday /
                      dashboardData.kpis.totalStudents) *
                      100,
                  )}% of cohort`}
                  pt={`${Math.round(
                    (dashboardData.kpis.activeToday /
                      dashboardData.kpis.totalStudents) *
                      100,
                  )}% da turma`}
                />
              ) : undefined
            }
            icon={<Flame className="h-3.5 w-3.5" />}
            tone="rose"
          />
          <KpiTile
            label={<T en="Avg streak" pt="Sequência média" />}
            value={dashboardData.kpis.avgStreak.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            sub={<T en="days / student" pt="dias / aluno" />}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            tone="amber"
          />
          <KpiTile
            label={<T en="Lessons / week" pt="Lições / semana" />}
            value={compactNumber(dashboardData.kpis.lessonsThisWeek)}
            fullValue={String(dashboardData.kpis.lessonsThisWeek)}
            sub={<T en="completed" pt="concluídas" />}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            tone="sky"
          />
          <KpiTile
            label={<T en="XP / week" pt="XP / semana" />}
            value={compactNumber(dashboardData.kpis.xpThisWeek)}
            fullValue={String(dashboardData.kpis.xpThisWeek)}
            sub={<T en="earned across cohort" pt="ganho pela turma" />}
            icon={<Trophy className="h-3.5 w-3.5" />}
            tone="violet"
          />
          <KpiTile
            label={
              <T
                en="Listening to review"
                pt="Áudios para revisar"
              />
            }
            value={compactNumber(pendingResponses.length)}
            fullValue={String(pendingResponses.length)}
            sub={
              <T
                en={`of ${listeningResponses.length} submissions`}
                pt={`de ${listeningResponses.length} envios`}
              />
            }
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
              <T en="Money this month" pt="Dinheiro neste mês" /> ·{" "}
              {monthLabel}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              <T
                en="Everything below stays private — only you see it."
                pt="Tudo abaixo é privado — só você visualiza."
              />
            </p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              label={<T en="Paid" pt="Recebido" />}
              value={compactBRL(paidCentsMonth)}
              fullValue={fullBRL(paidCentsMonth)}
              sub={
                <T
                  en={`${paidCount} of ${rows.length} students`}
                  pt={`${paidCount} de ${rows.length} alunos`}
                />
              }
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              tone="emerald"
            />
            <KpiTile
              label={<T en="Pending" pt="Pendente" />}
              value={compactBRL(pendingCentsMonth)}
              fullValue={fullBRL(pendingCentsMonth)}
              sub={
                <T
                  en={`${pendingCount} outstanding`}
                  pt={`${pendingCount} em aberto`}
                />
              }
              icon={<Clock className="h-3.5 w-3.5" />}
              tone="amber"
            />
            <KpiTile
              label={<T en="Debt (past due)" pt="Dívida (vencida)" />}
              value={compactBRL(debtCentsTotal)}
              fullValue={fullBRL(debtCentsTotal)}
              sub={
                <T
                  en={`${studentsInDebt.size} student${studentsInDebt.size === 1 ? "" : "s"}`}
                  pt={`${studentsInDebt.size} aluno${studentsInDebt.size === 1 ? "" : "s"}`}
                />
              }
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone={debtCentsTotal > 0 ? "rose" : "emerald"}
            />
            <KpiTile
              label={<T en="Monthly baseline" pt="Base mensal" />}
              value={compactBRL(monthlyBaselineCents)}
              fullValue={fullBRL(monthlyBaselineCents)}
              sub={
                <T
                  en={`${activeTuitionSeats} active seats`}
                  pt={`${activeTuitionSeats} assentos ativos`}
                />
              }
              icon={<Wallet className="h-3.5 w-3.5" />}
            />
            <KpiTile
              label={<T en="Revenue · 6 mo" pt="Receita · 6 meses" />}
              value={compactBRL(revenueTrailing6Cents)}
              fullValue={fullBRL(revenueTrailing6Cents)}
              sub={
                <T
                  en="Paid invoices, trailing"
                  pt="Faturas pagas no período"
                />
              }
              icon={<Sigma className="h-3.5 w-3.5" />}
              tone="emerald"
            />
            <KpiTile
              label={<T en="Revenue · 12 mo" pt="Receita · 12 meses" />}
              value={compactBRL(revenueTrailing12Cents)}
              fullValue={fullBRL(revenueTrailing12Cents)}
              sub={
                <T
                  en="Paid invoices, trailing"
                  pt="Faturas pagas no período"
                />
              }
              icon={<Sigma className="h-3.5 w-3.5" />}
              tone="indigo"
            />
            <KpiTile
              label={<T en="Avg tuition" pt="Mensalidade média" />}
              value={compactBRL(avgTuitionCents)}
              fullValue={fullBRL(avgTuitionCents)}
              sub={
                <T en="Across active seats" pt="Entre assentos ativos" />
              }
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Projection row — only shown when a baseline exists */}
          {monthlyBaselineCents > 0 ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-2">
              <KpiTile
                label={
                  <T
                    en="Expected · next 6 months"
                    pt="Projeção · próximos 6 meses"
                  />
                }
                value={compactBRL(monthlyBaselineCents * 6)}
                fullValue={fullBRL(monthlyBaselineCents * 6)}
                sub={
                  <T
                    en="Straight-line projection"
                    pt="Projeção linear"
                  />
                }
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                tone="sky"
              />
              <KpiTile
                label={
                  <T
                    en="Expected · next 24 months"
                    pt="Projeção · próximos 24 meses"
                  />
                }
                value={compactBRL(monthlyBaselineCents * 24)}
                fullValue={fullBRL(monthlyBaselineCents * 24)}
                sub={
                  <T
                    en="Straight-line projection"
                    pt="Projeção linear"
                  />
                }
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
                    <T
                      en={`${pendingResponses.length} listening response${pendingResponses.length === 1 ? "" : "s"} waiting for you`}
                      pt={`${pendingResponses.length} áudio${pendingResponses.length === 1 ? "" : "s"} de escuta esperando sua revisão`}
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <T
                      en="Review and leave feedback so the student can move on."
                      pt="Revise e deixe o feedback para o aluno seguir em frente."
                    />
                  </p>
                </div>
              </div>
              <Link
                href="/teacher/listening-responses"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                <T en="Review now" pt="Revisar agora" />
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
              <T en="Tuition matrix" pt="Matriz de mensalidades" />
            </h2>
            <p className="text-xs text-muted-foreground">
              <T
                en="Click any cell to toggle paid / pending. Future months appear automatically at every billing day."
                pt="Clique em qualquer célula para alternar entre pago e pendente. Meses futuros aparecem automaticamente a cada dia de cobrança."
              />
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
          <T en="Top students by XP" pt="Ranking de alunos por XP" />
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">
                  <T en="Student" pt="Aluno" />
                </th>
                <th className="px-4 py-2">
                  <T en="Classroom" pt="Turma" />
                </th>
                <th className="px-4 py-2 text-right">XP</th>
                <th className="px-4 py-2 text-right">
                  <T en="Lessons" pt="Lições" />
                </th>
                <th className="px-4 py-2 text-right">
                  <T en="Streak" pt="Sequência" />
                </th>
                <th className="px-4 py-2 text-right">
                  <T en="Last active" pt="Última atividade" />
                </th>
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
                    <T en="No students yet." pt="Ainda sem alunos." />
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
            <T
              en="AI tutor — per-student usage"
              pt="Tutor de IA — uso por aluno"
            />
          </h2>
          <p className="text-[11px] text-muted-foreground">
            <T
              en="Scoped to your classrooms · sorted by messages · user-role only"
              pt="Apenas suas turmas · ordenado por mensagens · somente mensagens do aluno"
            />
          </p>
        </div>
        <AiChatStatsTable rows={aiChatStats} />
      </section>

      {/* ========== Speaking lab — per-student usage ========== */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T
              en="Speaking lab — per-student usage"
              pt="Lab de fala — uso por aluno"
            />
          </h2>
          <p className="text-[11px] text-muted-foreground">
            <T
              en="Every mic activation + recorded minutes"
              pt="Cada clique no microfone + minutos gravados"
            />
          </p>
        </div>
        <SpeakingStatsTable rows={speakingStats} />
      </section>

      {/* ========== Classrooms ========== */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="Classrooms" pt="Turmas" />
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
                  <T
                    en={`${c.studentCount} student${c.studentCount === 1 ? "" : "s"} · invite `}
                    pt={`${c.studentCount} aluno${c.studentCount === 1 ? "" : "s"} · convite `}
                  />
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                    {c.inviteCode}
                  </code>
                </p>
              </CardContent>
            </Card>
          ))}
          {dashboardData.classrooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <T
                en="No classrooms yet. Create your first one from the dashboard."
                pt="Ainda sem turmas. Crie a primeira no painel inicial."
              />
            </p>
          ) : null}
        </div>
      </section>

      {/* ========== Deleted students archive ========== */}
      <DeletedStudentsPanel entries={deletedStudents} />

      {/* ========== CERTIFICATES — moved to the bottom at the
           teacher's request. Emitting a certificate is a
           milestone, not a daily task, so it sits below the
           everyday matrices + panels. */}
      <CertificatesSection
        certificates={certificatesForTeacher}
        students={rows.map((r) => ({
          id: r.roster_student_id,
          fullName: r.student_name,
          billingStartsOn: r.billing_starts_on,
          createdAt: r.roster_created_at,
        }))}
      />

      {/* ========== SERVICE RECEIPTS — sits below the certificates
           block per the teacher's request. Ad-hoc recibos for
           consultoria, tradução, mentoria — anything that doesn't
           fit the tuition matrix. */}
      <ServiceReceiptsSection
        receipts={serviceReceipts}
        students={rows.map((r) => ({
          id: r.roster_student_id,
          fullName: r.student_name,
        }))}
      />
    </div>
  );
}