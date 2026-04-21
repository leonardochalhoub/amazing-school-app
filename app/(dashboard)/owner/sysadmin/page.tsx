import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth/roles";
import { getSysadminOverview } from "@/lib/actions/sysadmin";
import { listRecentLogins } from "@/lib/actions/login-log";
import { listOwners, listRoleAuditLog } from "@/lib/actions/owner-grants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoginLogPanel } from "@/components/owner/login-log-panel";
import { SysadminCharts } from "@/components/owner/sysadmin-charts";
import { PlatformAccessCard } from "@/components/owner/platform-access-card";
import { TopAssignedTable } from "@/components/owner/top-assigned-table";
import { AiChatUsageTable } from "@/components/owner/ai-chat-usage-table";
import { SpeakingStatsTable } from "@/components/teacher/speaking-stats-table";
import { getAllSpeakingStats } from "@/lib/actions/speaking-events";
import { SysadminReportsPanel } from "@/components/reports/sysadmin-reports-panel";
import { T } from "@/components/reports/t";
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  Music2,
  FileCheck2,
  FileClock,
  Sparkles,
  Activity,
  Flame,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Trophy,
  MessageSquare,
  UserPlus,
  CircleDollarSign,
  Clock,
  ImageOff,
  Database,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Normalize teacher display names to Title Case so the sysadmin
// directory reads consistently even when signups used all-lowercase
// ("edvaldo gomes vieira"). We keep acronyms like "de", "da", "do"
// lowercase inside the phrase when they aren't the first word — this
// is the Brazilian naming convention ("Leonardo Nunes Moreira do
// Valle"). First word is always capitalized.
function titleCase(name: string | null | undefined): string {
  if (!name) return "—";
  const lowers = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && lowers.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export default async function SysadminPage() {
  const owner = await isOwner();
  if (!owner) redirect("/");

  const overview = await getSysadminOverview();
  if ("error" in overview) {
    return (
      <p className="py-12 text-center text-destructive">{overview.error}</p>
    );
  }
  const {
    kpis,
    growth,
    engagement,
    levelMix,
    allTeachers,
    allStudents,
    topActiveStudents,
    allTimeTopStudents,
    timeOnSite,
    topAssigned,
    aiChatUsage,
    contentMix,
    health,
  } = overview;
  const [logins, owners, audit, speakingStats] = await Promise.all([
    listRecentLogins(100),
    listOwners(),
    listRoleAuditLog(25),
    getAllSpeakingStats().catch(() => []),
  ]);

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sysadmin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <T en="Platform overview" pt="Visão geral da plataforma" />
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            <T
              en="Aggregate-only view. Per-student tuition, chat messages, and every teacher's finance matrix stay inside their own dashboards — this page never queries them."
              pt="Apenas dados agregados. Mensalidades por aluno, mensagens do tutor e a matriz financeira de cada professor ficam nos respectivos painéis — esta página nunca acessa esses dados."
            />
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          <T en="Privacy-scoped" pt="Escopo de privacidade" />
        </Badge>
      </header>

      {/* ============================ REPORTS ============================ */}
      <SysadminReportsPanel />

      {/* ============================ ROW 1 — scale ============================ */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="Platform scale" pt="Escala da plataforma" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi
            icon={<GraduationCap className="h-4 w-4" />}
            label={<T en="Teachers" pt="Professores" />}
            value={kpis.teachers}
          />
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label={<T en="Students" pt="Alunos" />}
            value={kpis.students}
            sub={
              <T
                en={`${kpis.rosterEntries} roster entries`}
                pt={`${kpis.rosterEntries} entradas de lista`}
              />
            }
          />
          <Kpi
            icon={<School className="h-4 w-4" />}
            label={<T en="Classrooms" pt="Turmas" />}
            value={kpis.classrooms}
          />
          <Kpi
            icon={<BookOpen className="h-4 w-4" />}
            label={<T en="Lessons in catalog" pt="Lições no catálogo" />}
            value={kpis.catalogLessons}
            sub={
              <T
                en={`${kpis.publishedLessons} teacher-published drafts`}
                pt={`${kpis.publishedLessons} rascunhos publicados por professores`}
              />
            }
          />
          <Kpi
            icon={<Music2 className="h-4 w-4" />}
            label={<T en="Songs in catalog" pt="Músicas no catálogo" />}
            value={kpis.catalogSongs}
          />
          <Kpi
            icon={<Sparkles className="h-4 w-4" />}
            label={<T en="Demo accounts" pt="Contas de demonstração" />}
            value={kpis.demoAccounts}
            sub={<T en="Accessible from landing" pt="Acessíveis pela landing" />}
            tone="indigo"
          />
        </div>
      </section>

      {/* ============================ ROW 2 — activity ============================ */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="Activity — last 30 days" pt="Atividade — últimos 30 dias" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi
            icon={<Flame className="h-4 w-4" />}
            label="DAU"
            value={kpis.dau}
            sub={<T en="Active today" pt="Ativos hoje" />}
            tone="rose"
          />
          <Kpi
            icon={<Activity className="h-4 w-4" />}
            label="WAU"
            value={kpis.wau}
            sub={<T en="Last 7 days" pt="Últimos 7 dias" />}
          />
          <Kpi
            icon={<Calendar className="h-4 w-4" />}
            label="MAU"
            value={kpis.mau}
            sub={<T en="Last 30 days" pt="Últimos 30 dias" />}
          />
          <Kpi
            icon={<Trophy className="h-4 w-4" />}
            label={<T en="XP earned" pt="XP acumulado" />}
            value={kpis.xpLast30d.toLocaleString()}
            sub={<T en="Aggregate, 30d" pt="Agregado, 30 dias" />}
            tone="emerald"
          />
          <Kpi
            icon={<ClipboardList className="h-4 w-4" />}
            label={<T en="Lessons assigned" pt="Lições atribuídas" />}
            value={kpis.lessonsAssignedLast30d}
            sub={
              <T en="30d, all teachers" pt="30 dias · todos os professores" />
            }
          />
          <Kpi
            icon={<ClipboardCheck className="h-4 w-4" />}
            label={<T en="Lessons completed" pt="Lições concluídas" />}
            value={kpis.lessonsCompletedLast30d}
            sub={<T en="30d, all students" pt="30 dias · todos os alunos" />}
            tone="emerald"
          />
        </div>
      </section>

      {/* ============================ Row 3 — engagement extras ============================ */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={<MessageSquare className="h-4 w-4" />}
          label={<T en="AI chat messages" pt="Mensagens no tutor IA" />}
          value={kpis.aiMessagesLast30d.toLocaleString()}
          sub={
            <T
              en={`${kpis.conversationsLast30d} conversations · 30d`}
              pt={`${kpis.conversationsLast30d} conversas · 30 dias`}
            />
          }
        />
        <Kpi
          icon={<UserPlus className="h-4 w-4" />}
          label={<T en="New accounts" pt="Novas contas" />}
          value={kpis.newAccountsLast30d}
          sub={
            <T
              en={`${kpis.newAccountsThisMonth} this calendar month`}
              pt={`${kpis.newAccountsThisMonth} neste mês`}
            />
          }
        />
        <Kpi
          icon={<CircleDollarSign className="h-4 w-4" />}
          label={<T en="Active tuition seats" pt="Mensalidades ativas" />}
          value={kpis.activeTuitionSeats}
          sub={
            <T en="Count only — no amounts" pt="Somente a contagem — sem valores" />
          }
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label={<T en="Invoices this month" pt="Faturas neste mês" />}
          value={`${kpis.paidInvoicesThisMonth} / ${kpis.paidInvoicesThisMonth + kpis.pendingInvoicesThisMonth}`}
          sub={<T en="Paid / total (aggregate)" pt="Pagas / total (agregado)" />}
        />
      </section>

      {/* ============================ Charts ============================ */}
      <SysadminCharts
        growth={growth}
        engagement={engagement}
        levelMix={levelMix}
        lessonsPerCefr={contentMix.lessonsPerCefr}
        songsPerCefr={contentMix.songsPerCefr}
      />

      {/* ============================ All teachers directory ============================ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T
              en={`All teachers (${allTeachers.length})`}
              pt={`Todos os professores (${allTeachers.length})`}
            />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Sorted by join date (newest first) · no revenue data"
              pt="Ordenado por data de cadastro (mais recentes primeiro) · sem dados de receita"
            />
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">
                  <T en="Teacher" pt="Professor" />
                </th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">
                  <T en="Location" pt="Localização" />
                </th>
                <th className="px-4 py-2 text-right">
                  <T en="Students" pt="Alunos" />
                </th>
                <th className="px-4 py-2 text-right">
                  <T en="Classrooms" pt="Turmas" />
                </th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  <T en="Active · 30d" pt="Ativos · 30d" />
                </th>
                <th className="px-4 py-2 text-right">
                  <T en="Joined" pt="Cadastro" />
                </th>
              </tr>
            </thead>
            <tbody>
              {allTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    <T en="No teachers yet." pt="Ainda sem professores." />
                  </td>
                </tr>
              ) : null}
              {[...allTeachers]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {titleCase(t.name)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {t.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {t.location ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.studentCount}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.classroomsCount}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.activeStudentsLast30d}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================ All students directory ============================ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T
              en={`All students (${allStudents.length})`}
              pt={`Todos os alunos (${allStudents.length})`}
            />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Every student any teacher has created · sorted by name"
              pt="Todos os alunos criados por qualquer professor · ordenados por nome"
            />
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">
                  <T en="Student" pt="Aluno" />
                </th>
                <th className="px-4 py-2">
                  <T en="Teacher" pt="Professor" />
                </th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  <T en="Added" pt="Cadastrado em" />
                </th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  <T en="Last active" pt="Última atividade" />
                </th>
              </tr>
            </thead>
            <tbody>
              {allStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    <T en="No students yet." pt="Ainda sem alunos." />
                  </td>
                </tr>
              ) : null}
              {[...allStudents]
                .sort((a, b) =>
                  (a.fullName ?? "")
                    .trim()
                    .localeCompare((b.fullName ?? "").trim(), "pt-BR", {
                      sensitivity: "base",
                      numeric: true,
                    }),
                )
                .map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {titleCase(s.fullName)}
                    {!s.signedUp ? (
                      <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <T en="Invite pending" pt="Convite pendente" />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.teacherName ? titleCase(s.teacherName) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(s.addedAt).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {s.lastActivityAt
                      ? new Date(s.lastActivityAt).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================ Top active students ============================ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="Most engaged students" pt="Alunos mais engajados" />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Ranked by XP earned in the last 30 days"
              pt="Ordenados por XP obtido nos últimos 30 dias"
            />
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {topActiveStudents.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{i + 1}
                  </span>
                  {s.cefrLevel ? (
                    <Badge variant="outline" className="text-[10px]">
                      {s.cefrLevel.toUpperCase()}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 truncate font-semibold leading-tight">
                  {s.displayName}
                </p>
                {s.teacherName ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    <T
                      en={`with ${s.teacherName}`}
                      pt={`com ${s.teacherName}`}
                    />
                  </p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {s.xpLast30d.toLocaleString()} XP
                  {s.streak > 0 ? (
                    <T
                      en={` · ${s.streak}d streak`}
                      pt={` · ${s.streak}d de sequência`}
                    />
                  ) : (
                    ""
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
          {topActiveStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-5">
              <T
                en="No XP events in the last 30 days."
                pt="Sem eventos de XP nos últimos 30 dias."
              />
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================ All-time top students ============================ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="All-time hall of fame" pt="Hall da fama de todos os tempos" />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Ranked by lifetime XP since their first lesson"
              pt="Ordenados pelo XP total desde a primeira lição"
            />
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {allTimeTopStudents.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{i + 1}
                  </span>
                  {s.cefrLevel ? (
                    <Badge variant="outline" className="text-[10px]">
                      {s.cefrLevel.toUpperCase()}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 truncate font-semibold leading-tight">
                  {s.displayName}
                </p>
                {s.teacherName ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    <T
                      en={`with ${s.teacherName}`}
                      pt={`com ${s.teacherName}`}
                    />
                  </p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  <T
                    en={`${s.xpTotal.toLocaleString()} XP lifetime`}
                    pt={`${s.xpTotal.toLocaleString()} XP no total`}
                  />
                </p>
              </CardContent>
            </Card>
          ))}
          {allTimeTopStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-5">
              <T
                en="No XP events on the platform yet."
                pt="Ainda sem eventos de XP na plataforma."
              />
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================ Top assigned lessons + songs ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="Top assigned" pt="Mais atribuídas" />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Most-assigned across every teacher and classroom. Sorted descending · top 10 shown, click Show all for the rest."
              pt="Mais atribuídas em todos os professores e turmas. Ordem decrescente · 10 primeiras exibidas; clique em Mostrar todas para ver o restante."
            />
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T
                en={`Lessons (${topAssigned.lessons.length})`}
                pt={`Lições (${topAssigned.lessons.length})`}
              />
            </h3>
            <TopAssignedTable rows={topAssigned.lessons} unit="lesson" />
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T
                en={`Songs (${topAssigned.songs.length})`}
                pt={`Músicas (${topAssigned.songs.length})`}
              />
            </h3>
            <TopAssignedTable rows={topAssigned.songs} unit="song" />
          </div>
        </div>
      </section>

      {/* ============================ AI chat usage ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="AI tutor usage" pt="Uso do tutor IA" />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="User-role messages only · sorted descending · top 10 shown. Days = distinct calendar days the user sent a message."
              pt="Apenas mensagens do usuário · ordem decrescente · 10 primeiros exibidos. Dias = dias distintos em que o usuário enviou mensagem."
            />
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T
                en={`Teachers (${aiChatUsage.teachers.length})`}
                pt={`Professores (${aiChatUsage.teachers.length})`}
              />
            </h3>
            <AiChatUsageTable rows={aiChatUsage.teachers} kind="teacher" />
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T
                en={`Students (${aiChatUsage.students.length})`}
                pt={`Alunos (${aiChatUsage.students.length})`}
              />
            </h3>
            <AiChatUsageTable rows={aiChatUsage.students} kind="student" />
          </div>
        </div>
      </section>

      {/* ============================ Speaking lab usage ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T
              en="Speaking lab — per-user usage"
              pt="Lab de fala — uso por usuário"
            />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Every mic activation + recorded minutes · sorted descending."
              pt="Cada clique no microfone + minutos gravados · ordem decrescente."
            />
          </p>
        </div>
        <SpeakingStatsTable rows={speakingStats} linkStudents={false} />
      </section>

      {/* ============================ Time on site ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="Time on site" pt="Tempo no site" />
          </h2>
          <p className="text-xs text-muted-foreground">
            <T
              en="Sorted descending · ticks only while the tab is focused (pauses on tab-switch, stops on tab close). Real session heartbeats only — zero until the user loads a page on the new build."
              pt="Ordem decrescente · conta apenas com a aba em foco (pausa ao trocar de aba, para ao fechar). Apenas heartbeats reais — fica zerado até o usuário abrir uma página na nova build."
            />
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T en="Teachers" pt="Professores" />
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[440px] w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">
                      <T en="Teacher" pt="Professor" />
                    </th>
                    <th className="px-4 py-2 text-right whitespace-nowrap">
                      <T en="Active days" pt="Dias ativos" />
                    </th>
                    <th className="px-4 py-2 text-right">
                      <T en="Minutes" pt="Minutos" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeOnSite.teachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-xs text-muted-foreground"
                      >
                        <T
                          en="No teacher activity tracked yet."
                          pt="Nenhuma atividade de professor registrada ainda."
                        />
                      </td>
                    </tr>
                  ) : null}
                  {timeOnSite.teachers.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {titleCase(t.name)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {t.activeDays}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {t.minutes.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <T en="Students" pt="Alunos" />
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">
                      <T en="Student" pt="Aluno" />
                    </th>
                    <th className="px-4 py-2">
                      <T en="Teacher" pt="Professor" />
                    </th>
                    <th className="px-4 py-2 text-right">
                      <T en="Lessons" pt="Lições" />
                    </th>
                    <th className="px-4 py-2 text-right">
                      <T en="Minutes" pt="Minutos" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeOnSite.students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-muted-foreground"
                      >
                        <T
                          en="No completed lessons yet."
                          pt="Ainda sem lições concluídas."
                        />
                      </td>
                    </tr>
                  ) : null}
                  {timeOnSite.students.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {titleCase(s.displayName)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {s.teacherName ? titleCase(s.teacherName) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {s.lessons}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {s.minutes.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ Health ============================ */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <T en="System health" pt="Saúde do sistema" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Kpi
            icon={<Database className="h-4 w-4" />}
            label={<T en="Avatar objects" pt="Avatares armazenados" />}
            value={health.storageAvatarCount}
            sub={<T en="In avatars bucket" pt="No bucket de avatares" />}
          />
          <Kpi
            icon={<ImageOff className="h-4 w-4" />}
            label={<T en="No avatar" pt="Sem avatar" />}
            value={health.accountsWithoutAvatar}
            sub={
              <T en="Accounts missing photo" pt="Contas sem foto" />
            }
            tone={health.accountsWithoutAvatar > 0 ? "amber" : undefined}
          />
          <Kpi
            icon={<School className="h-4 w-4" />}
            label={<T en="Empty classrooms" pt="Turmas vazias" />}
            value={health.classroomsWithoutStudents}
            sub={<T en="No students joined" pt="Sem alunos cadastrados" />}
            tone={health.classroomsWithoutStudents > 0 ? "amber" : undefined}
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label={<T en="Unlinked roster" pt="Listas não vinculadas" />}
            value={health.rosterWithoutAuthUser}
            sub={
              <T en="No auth_user_id yet" pt="Ainda sem auth_user_id" />
            }
            tone={health.rosterWithoutAuthUser > 0 ? "amber" : undefined}
          />
        </div>
      </section>

      {/* ============================ Drafts ============================ */}
      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={<FileCheck2 className="h-4 w-4 text-emerald-600" />}
          title={<T en="Published drafts" pt="Rascunhos publicados" />}
          value={kpis.publishedLessons}
          hint={
            <T
              en="Teacher-reviewed lessons live for their students."
              pt="Lições revisadas pelo professor, disponíveis aos alunos."
            />
          }
        />
        <InfoCard
          icon={<FileClock className="h-4 w-4 text-amber-600" />}
          title={<T en="Unpublished drafts" pt="Rascunhos não publicados" />}
          value={kpis.draftLessons}
          hint={
            <T
              en="Awaiting teacher review. Never shown to students."
              pt="Aguardando revisão do professor. Nunca exibidos aos alunos."
            />
          }
        />
      </section>

      <PlatformAccessCard currentOwners={owners} audit={audit} />

      <LoginLogPanel entries={logins} />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: number | string;
  sub?: React.ReactNode;
  tone?: "emerald" | "amber" | "rose" | "indigo";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : tone === "indigo"
            ? "text-indigo-600 dark:text-indigo-400"
            : "";
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div
          className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${toneClass}`}
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

function InfoCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  value: number;
  hint: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
