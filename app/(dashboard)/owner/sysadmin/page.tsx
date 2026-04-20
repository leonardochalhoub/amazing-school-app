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
import { SysadminReportsPanel } from "@/components/reports/sysadmin-reports-panel";
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
  const [logins, owners, audit] = await Promise.all([
    listRecentLogins(100),
    listOwners(),
    listRoleAuditLog(25),
  ]);

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sysadmin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Platform overview
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Aggregate-only view. Per-student tuition, chat messages, and every
            teacher's finance matrix stay inside their own dashboards — this
            page never queries them.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          Privacy-scoped
        </Badge>
      </header>

      {/* ============================ REPORTS ============================ */}
      <SysadminReportsPanel />

      {/* ============================ ROW 1 — scale ============================ */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform scale
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi
            icon={<GraduationCap className="h-4 w-4" />}
            label="Teachers"
            value={kpis.teachers}
          />
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label="Students"
            value={kpis.students}
            sub={`${kpis.rosterEntries} roster entries`}
          />
          <Kpi
            icon={<School className="h-4 w-4" />}
            label="Classrooms"
            value={kpis.classrooms}
          />
          <Kpi
            icon={<BookOpen className="h-4 w-4" />}
            label="Lessons in catalog"
            value={kpis.catalogLessons}
            sub={`${kpis.publishedLessons} teacher-published drafts`}
          />
          <Kpi
            icon={<Music2 className="h-4 w-4" />}
            label="Songs in catalog"
            value={kpis.catalogSongs}
          />
          <Kpi
            icon={<Sparkles className="h-4 w-4" />}
            label="Demo accounts"
            value={kpis.demoAccounts}
            sub="Accessible from landing"
            tone="indigo"
          />
        </div>
      </section>

      {/* ============================ ROW 2 — activity ============================ */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity — last 30 days
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
          <Kpi
            icon={<Flame className="h-4 w-4" />}
            label="DAU"
            value={kpis.dau}
            sub="Active today"
            tone="rose"
          />
          <Kpi
            icon={<Activity className="h-4 w-4" />}
            label="WAU"
            value={kpis.wau}
            sub="Last 7 days"
          />
          <Kpi
            icon={<Calendar className="h-4 w-4" />}
            label="MAU"
            value={kpis.mau}
            sub="Last 30 days"
          />
          <Kpi
            icon={<Trophy className="h-4 w-4" />}
            label="XP earned"
            value={kpis.xpLast30d.toLocaleString()}
            sub="Aggregate, 30d"
            tone="emerald"
          />
          <Kpi
            icon={<ClipboardList className="h-4 w-4" />}
            label="Lessons assigned"
            value={kpis.lessonsAssignedLast30d}
            sub="30d, all teachers"
          />
          <Kpi
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Lessons completed"
            value={kpis.lessonsCompletedLast30d}
            sub="30d, all students"
            tone="emerald"
          />
        </div>
      </section>

      {/* ============================ Row 3 — engagement extras ============================ */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={<MessageSquare className="h-4 w-4" />}
          label="AI chat messages"
          value={kpis.aiMessagesLast30d.toLocaleString()}
          sub={`${kpis.conversationsLast30d} conversations · 30d`}
        />
        <Kpi
          icon={<UserPlus className="h-4 w-4" />}
          label="New accounts"
          value={kpis.newAccountsLast30d}
          sub={`${kpis.newAccountsThisMonth} this calendar month`}
        />
        <Kpi
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="Active tuition seats"
          value={kpis.activeTuitionSeats}
          sub="Count only — no amounts"
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Invoices this month"
          value={`${kpis.paidInvoicesThisMonth} / ${kpis.paidInvoicesThisMonth + kpis.pendingInvoicesThisMonth}`}
          sub="Paid / total (aggregate)"
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
            All teachers ({allTeachers.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Sorted by name · no revenue data
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Teacher</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right">Students</th>
                <th className="px-4 py-2 text-right">Classrooms</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  Active · 30d
                </th>
                <th className="px-4 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {allTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No teachers yet.
                  </td>
                </tr>
              ) : null}
              {allTeachers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {titleCase(t.name)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {t.email ?? "—"}
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
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {t.createdAt.slice(0, 10)}
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
            All students ({allStudents.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Every student any teacher has created · sorted by name
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Teacher</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  Added
                </th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  Last active
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
                    No students yet.
                  </td>
                </tr>
              ) : null}
              {allStudents.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {titleCase(s.fullName)}
                    {!s.signedUp ? (
                      <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Invite pending
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.teacherName ? titleCase(s.teacherName) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                    {s.addedAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                    {s.lastActivityAt ? s.lastActivityAt.slice(0, 10) : "—"}
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
            Most engaged students
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked by XP earned in the last 30 days
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
                    with {s.teacherName}
                  </p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {s.xpLast30d.toLocaleString()} XP
                  {s.streak > 0 ? ` · ${s.streak}d streak` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
          {topActiveStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-5">
              No XP events in the last 30 days.
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================ All-time top students ============================ */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All-time hall of fame
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked by lifetime XP since their first lesson
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
                    with {s.teacherName}
                  </p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {s.xpTotal.toLocaleString()} XP lifetime
                </p>
              </CardContent>
            </Card>
          ))}
          {allTimeTopStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-5">
              No XP events on the platform yet.
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================ Top assigned lessons + songs ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top assigned
          </h2>
          <p className="text-xs text-muted-foreground">
            Most-assigned across every teacher and classroom. Sorted
            descending · top 10 shown, click Show all for the rest.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lessons ({topAssigned.lessons.length})
            </h3>
            <TopAssignedTable rows={topAssigned.lessons} unit="lesson" />
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Songs ({topAssigned.songs.length})
            </h3>
            <TopAssignedTable rows={topAssigned.songs} unit="song" />
          </div>
        </div>
      </section>

      {/* ============================ AI chat usage ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AI tutor usage
          </h2>
          <p className="text-xs text-muted-foreground">
            User-role messages only · sorted descending · top 10 shown.
            Days = distinct calendar days the user sent a message.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Teachers ({aiChatUsage.teachers.length})
            </h3>
            <AiChatUsageTable rows={aiChatUsage.teachers} kind="teacher" />
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Students ({aiChatUsage.students.length})
            </h3>
            <AiChatUsageTable rows={aiChatUsage.students} kind="student" />
          </div>
        </div>
      </section>

      {/* ============================ Time on site ============================ */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Time on site
          </h2>
          <p className="text-xs text-muted-foreground">
            Sorted descending · ticks only while the tab is focused
            (pauses on tab-switch, stops on tab close). Real session
            heartbeats only — zero until the user loads a page on
            the new build.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Teachers
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[440px] w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Teacher</th>
                    <th className="px-4 py-2 text-right whitespace-nowrap">
                      Active days
                    </th>
                    <th className="px-4 py-2 text-right">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {timeOnSite.teachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-xs text-muted-foreground"
                      >
                        No teacher activity tracked yet.
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
              Students
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Teacher</th>
                    <th className="px-4 py-2 text-right">Lessons</th>
                    <th className="px-4 py-2 text-right">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {timeOnSite.students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-muted-foreground"
                      >
                        No completed lessons yet.
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
          System health
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Kpi
            icon={<Database className="h-4 w-4" />}
            label="Avatar objects"
            value={health.storageAvatarCount}
            sub="In avatars bucket"
          />
          <Kpi
            icon={<ImageOff className="h-4 w-4" />}
            label="No avatar"
            value={health.accountsWithoutAvatar}
            sub="Accounts missing photo"
            tone={health.accountsWithoutAvatar > 0 ? "amber" : undefined}
          />
          <Kpi
            icon={<School className="h-4 w-4" />}
            label="Empty classrooms"
            value={health.classroomsWithoutStudents}
            sub="No students joined"
            tone={health.classroomsWithoutStudents > 0 ? "amber" : undefined}
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Unlinked roster"
            value={health.rosterWithoutAuthUser}
            sub="No auth_user_id yet"
            tone={health.rosterWithoutAuthUser > 0 ? "amber" : undefined}
          />
        </div>
      </section>

      {/* ============================ Drafts ============================ */}
      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={<FileCheck2 className="h-4 w-4 text-emerald-600" />}
          title="Published drafts"
          value={kpis.publishedLessons}
          hint="Teacher-reviewed lessons live for their students."
        />
        <InfoCard
          icon={<FileClock className="h-4 w-4 text-amber-600" />}
          title="Unpublished drafts"
          value={kpis.draftLessons}
          hint="Awaiting teacher review. Never shown to students."
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
  label: string;
  value: number | string;
  sub?: string;
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
  title: string;
  value: number;
  hint: string;
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
