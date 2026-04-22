import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CalendarClock,
  Eye,
  Flame,
  Zap,
  CheckCircle2,
  BookOpen,
  Award,
} from "lucide-react";
import { T } from "@/components/reports/t";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterStudent, getRosterAvatarSignedUrl } from "@/lib/actions/roster";
import { AvatarDisplay } from "@/components/shared/avatar-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CertificatesPanel } from "@/components/reports/certificates-panel";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { BadgeChip } from "@/components/gamification/badge-chip";
import { listCertificatesForStudent } from "@/lib/actions/certificates";
import { getAssignmentsForRosterStudent } from "@/lib/actions/assignments";
import { getLiveClassSummaryForRoster } from "@/lib/actions/live-class-hours";
import { formatHoursMinutes } from "@/lib/actions/student-history-types";
import { getLevel, getXpForNextLevel } from "@/lib/gamification/engine";
import { awardEligibleBadges } from "@/lib/gamification/award-badges";
import {
  ActivityChart,
  type ActivityBucket,
} from "@/components/student/activity-chart";

/**
 * Teacher's read-only view of a student's profile — rendered exactly
 * as the student sees it but without edit controls. Meant to be
 * opened from the per-student page in a new browser tab so the
 * teacher can see what the student sees without leaving their own
 * workspace.
 */
export default async function StudentViewAsStudent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await getRosterStudent(id);
  if (!student) notFound();

  const admin = createAdminClient();

  // Locate the student's signed-in identity (if they claimed the
  // invite) to read their own profile row (location lives there).
  let profileLocation: string | null = null;
  let selfAvatarSignedUrl: string | null = null;
  if (student.auth_user_id) {
    const { data: selfProfile } = await admin
      .from("profiles")
      .select("location, avatar_url")
      .eq("id", student.auth_user_id)
      .maybeSingle();
    profileLocation =
      (selfProfile as { location?: string | null } | null)?.location ?? null;
    if ((selfProfile as { avatar_url?: string | null } | null)?.avatar_url) {
      const { data } = await admin.storage
        .from("avatars")
        .createSignedUrl(`${student.auth_user_id}.webp`, 3600);
      selfAvatarSignedUrl = data?.signedUrl ?? null;
    }
  }

  const rosterAvatarUrl = student.has_avatar
    ? await getRosterAvatarSignedUrl(id)
    : null;
  const avatarUrl = selfAvatarSignedUrl ?? rosterAvatarUrl;

  const certificates = await listCertificatesForStudent(id);

  // Main-page data: XP, level, assignment counts, badges. Scoped to
  // this roster student (by auth_user_id when the invite was
  // claimed; numbers land as zero otherwise).
  const studentAuthId = student.auth_user_id ?? null;
  let totalXp = 0;
  let assignedCount = 0;
  let completedCount = 0;
  let badges: Array<{ badge_type: string; earned_at: string }> = [];
  let recentCompletions: Array<{ lesson_slug: string; completed_at: string }> =
    [];
  let pendingAssignments: string[] = [];
  let lastClassDate: string | null = null;
  let nextClassDate: string | null = null;
  let daysActiveLast30 = 0;
  // Assignments via the shared helper so we pick up BOTH per-roster
  // rows and classroom-wide rows (+ historic classroom membership) —
  // the same union the teacher's per-student page uses. A direct
  // .eq("classroom_id", rosterRow.classroom_id) query returns zero
  // when a student was moved / roster was relinked, which was why
  // the count showed 0 for Tati even though she had live assignments.
  const allAssignments = await getAssignmentsForRosterStudent(id);
  const liveClasses = await getLiveClassSummaryForRoster(id).catch(() => ({
    totalMinutes: 0,
    thisMonthMinutes: 0,
    bySkill: {},
    monthly: [],
  }));

  // Build the same 24-month activity buckets the student sees on their
  // own /student dashboard. Lessons + Music + Live Classes stack
  // monthly so the teacher sees identical data to the student.
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const ACTIVITY_MONTHS = 24;
  const _now = new Date(Date.now() + BRT_OFFSET_MS);
  const _curYear = _now.getUTCFullYear();
  const _curMonth = _now.getUTCMonth();
  const activityBuckets: ActivityBucket[] = [];
  const bucketIndexByKey = new Map<string, number>();
  for (let i = ACTIVITY_MONTHS - 1; i >= 0; i--) {
    let y = _curYear;
    let m = _curMonth - i;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    bucketIndexByKey.set(key, activityBuckets.length);
    activityBuckets.push({
      start: `${key}-01`,
      lessons: 0,
      music: 0,
      live: 0,
    });
  }
  function _monthKey(d: Date): string {
    const brt = new Date(d.getTime() + BRT_OFFSET_MS);
    return `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  // Seed lessons + music from this student's lesson_progress rows.
  if (student.auth_user_id) {
    const { data: completions } = await admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at")
      .eq("student_id", student.auth_user_id)
      .not("completed_at", "is", null)
      .limit(10_000);
    for (const c of (completions ?? []) as Array<{
      lesson_slug: string;
      completed_at: string;
    }>) {
      const idx = bucketIndexByKey.get(_monthKey(new Date(c.completed_at)));
      if (idx === undefined) continue;
      if (c.lesson_slug.startsWith("music:"))
        activityBuckets[idx].music++;
      else activityBuckets[idx].lessons++;
    }
  }
  // Seed live classes from student_history (per-roster + classroom-wide).
  {
    type LiveRow = { event_date: string };
    const [perRes, classRes] = await Promise.all([
      admin
        .from("student_history")
        .select("event_date")
        .eq("roster_student_id", id)
        .not("duration_minutes", "is", null),
      student.classroom_id
        ? admin
            .from("student_history")
            .select("event_date")
            .eq("classroom_id", student.classroom_id)
            .is("roster_student_id", null)
            .not("duration_minutes", "is", null)
        : Promise.resolve({ data: [] as LiveRow[] }),
    ]);
    const liveRows = [
      ...((perRes.data ?? []) as LiveRow[]),
      ...((classRes.data ?? []) as LiveRow[]),
    ];
    for (const lr of liveRows) {
      const idx = bucketIndexByKey.get(_monthKey(new Date(lr.event_date)));
      if (idx === undefined) continue;
      activityBuckets[idx].live = (activityBuckets[idx].live ?? 0) + 1;
    }
  }
  assignedCount = allAssignments.length;
  completedCount = allAssignments.filter((a) => a.status === "completed")
    .length;
  pendingAssignments = allAssignments
    .filter((a) => a.status !== "completed")
    .slice(0, 5)
    .map((a) => a.lesson_slug);

  if (studentAuthId) {
    // Lazy catch-up: trigger the same idempotent badge-award pass the
    // student dashboard runs, so teachers viewing a student who
    // predates the signup hook (e.g. Tati) see their retroactive
    // badges materialise without waiting for that student to log in
    // themselves. Safe to call on every view — existing rows are
    // skipped inside awardEligibleBadges.
    try {
      await awardEligibleBadges(studentAuthId);
    } catch (err) {
      console.error("teacher view lazy badge award:", err);
    }
    const [xpRes, progRes, badgeRes, historyRes, activityRes] =
      await Promise.all([
        admin
          .from("xp_events")
          .select("xp_amount")
          .eq("student_id", studentAuthId),
        admin
          .from("lesson_progress")
          .select("lesson_slug, completed_at")
          .eq("student_id", studentAuthId)
          .order("completed_at", { ascending: false })
          .limit(50),
        admin
          .from("badges")
          .select("badge_type, earned_at")
          .eq("student_id", studentAuthId)
          .order("earned_at", { ascending: false })
          .limit(12),
        // Per-roster-student events.
        admin
          .from("student_history")
          .select("event_date, status, classroom_id, roster_student_id")
          .eq("roster_student_id", id)
          .order("event_date", { ascending: false })
          .limit(100),
        admin
          .from("daily_activity")
          .select("activity_date")
          .eq("student_id", studentAuthId)
          .gte(
            "activity_date",
            new Date(Date.now() - 30 * 86_400_000)
              .toISOString()
              .slice(0, 10),
          ),
      ]);
    totalXp = ((xpRes.data ?? []) as Array<{ xp_amount: number }>).reduce(
      (sum, r) => sum + (r.xp_amount ?? 0),
      0,
    );
    const completedRows = ((progRes.data ?? []) as Array<{
      lesson_slug: string;
      completed_at: string | null;
    }>).filter((r): r is { lesson_slug: string; completed_at: string } =>
      Boolean(r.completed_at),
    );
    const completedSlugs = new Set(completedRows.map((r) => r.lesson_slug));
    recentCompletions = completedRows.slice(0, 5);
    // Refine completedCount with lesson_progress evidence — an
    // assignment stuck on 'assigned' but with a progress row is
    // effectively done.
    completedCount = allAssignments.filter(
      (a) => a.status === "completed" || completedSlugs.has(a.lesson_slug),
    ).length;
    pendingAssignments = allAssignments
      .filter(
        (a) =>
          a.status !== "completed" && !completedSlugs.has(a.lesson_slug),
      )
      .slice(0, 5)
      .map((a) => a.lesson_slug);
    // Class history: figure out the most recent done/absent and the
    // next planned one. Pulls per-roster rows AND classroom-wide
    // rows for the student's classroom (the Schedule-class flow
    // writes either, depending on whether the teacher targeted the
    // student or the whole class).
    const perStudentHist = (historyRes.data ?? []) as Array<{
      event_date: string;
      status: string;
      classroom_id: string | null;
      roster_student_id: string | null;
    }>;
    let classroomWideHist: typeof perStudentHist = [];
    if (student.classroom_id) {
      const { data } = await admin
        .from("student_history")
        .select("event_date, status, classroom_id, roster_student_id")
        .eq("classroom_id", student.classroom_id)
        .is("roster_student_id", null)
        .order("event_date", { ascending: false })
        .limit(100);
      classroomWideHist = (data as typeof perStudentHist) ?? [];
    }
    const history = [...perStudentHist, ...classroomWideHist].sort((a, b) =>
      b.event_date.localeCompare(a.event_date),
    );
    const todayISO = new Date().toISOString().slice(0, 10);
    lastClassDate =
      history.find(
        (h) => h.event_date <= todayISO && h.status !== "Planned",
      )?.event_date ?? null;
    nextClassDate =
      [...history]
        .reverse()
        .find((h) => h.event_date >= todayISO && h.status === "Planned")
        ?.event_date ?? null;
    daysActiveLast30 = new Set(
      ((activityRes.data ?? []) as Array<{ activity_date: string }>).map(
        (r) => r.activity_date,
      ),
    ).size;
    badges = (badgeRes.data ?? []) as Array<{
      badge_type: string;
      earned_at: string;
    }>;
  }
  const level = getLevel(totalXp);
  const xpProg = getXpForNextLevel(totalXp);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const startingDateIso =
    student.billing_starts_on ?? student.created_at ?? null;
  const startingDate = startingDateIso ? fmtDate(startingDateIso) : null;
  const endDateIso = student.ended_on ?? null;
  const endDate = endDateIso ? fmtDate(endDateIso) : null;
  const daysStudying = startingDateIso
    ? Math.max(
        0,
        Math.floor(
          ((endDateIso ? new Date(endDateIso).getTime() : Date.now()) -
            new Date(startingDateIso).getTime()) /
            86_400_000,
        ),
      )
    : null;

  const isFemale = student.gender === "female";
  const studentWord = isFemale ? "aluna" : "aluno";
  const studentArticle = isFemale ? "da" : "do";

  return (
    <div className="space-y-4">
      {/* Upper bar — prominent read-only context for the teacher */}
      <div className="sticky top-16 z-30 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-400/40 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-pink-500/10 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-indigo-500/20 px-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <Eye className="h-3 w-3" />
            <T
              en="Student's profile"
              pt={`Perfil ${studentArticle} ${studentWord}`}
            />
          </span>
          <span className="truncate font-medium">{student.full_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/teacher/students/${id}`}
            className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-1 font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <T en="Back to management" pt="Voltar à gestão" />
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <Tabs defaultValue="main" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="main">
              <T en="Main page" pt="Página principal" />
            </TabsTrigger>
            <TabsTrigger value="profile">
              <T
                en="Profile"
                pt={`Perfil ${studentArticle} ${studentWord}`}
              />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-6">
            {/* HERO — avatar + name + level + XP bar in one card so the
                top of the page reads at a glance, mobile or desktop. */}
            <Card className="overflow-hidden">
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10"
                />
                <CardContent className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                  <div className="relative shrink-0">
                    <AvatarDisplay
                      fullName={student.full_name}
                      signedUrl={avatarUrl}
                      className="h-20 w-20 ring-4 ring-background sm:h-24 sm:w-24"
                    />
                    <span
                      className="absolute -bottom-1 -right-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-1.5 text-xs font-bold text-white shadow"
                      title={`Level ${level}`}
                    >
                      {level}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <T en="Hi," pt="Olá," />
                      </p>
                      <h1 className="truncate text-2xl font-bold sm:text-3xl">
                        {student.full_name.split(" ")[0]}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        <T
                          en="Summary of what the student sees · read-only"
                          pt={`Resumo do que ${isFemale ? "a" : "o"} ${studentWord} vê · somente leitura`}
                        />
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Zap className="h-3 w-3 text-amber-500" />
                          Lv.{level} · {totalXp.toLocaleString("pt-BR")} XP
                        </span>
                        <span className="text-muted-foreground">
                          <T
                            en={`${Math.max(0, xpProg.needed - xpProg.current)} to Lv ${level + 1}`}
                            pt={`faltam ${Math.max(0, xpProg.needed - xpProg.current)} para Lv ${level + 1}`}
                          />
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(xpProg.progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="relative h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-[width] duration-700"
                          style={{
                            width: `${Math.max(0, Math.min(100, xpProg.progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* KPI strip — 2-up on mobile, 4-up on tablet+ */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <KpiTile
                icon={<BookOpen className="h-5 w-5" />}
                tone="sky"
                label={<T en="Assigned" pt="Atribuídas" />}
                value={assignedCount}
              />
              <KpiTile
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="emerald"
                label={<T en="Completed" pt="Concluídas" />}
                value={completedCount}
              />
              <KpiTile
                icon={<Flame className="h-5 w-5" />}
                tone="violet"
                label={<T en="Active · 30d" pt="Ativos · 30d" />}
                value={daysActiveLast30}
              />
              <KpiTile
                icon={<CalendarClock className="h-5 w-5" />}
                tone="rose"
                label={<T en="Next class" pt="Próxima aula" />}
                value={
                  nextClassDate
                    ? new Date(nextClassDate).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"
                }
                small
              />
            </div>

            {/* Two-column body — main column gets the time-series cards,
                side column gets badges + live class summary + tenure. */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {/* Activity chart — exact same component the student
                    sees on /student. Stacked bars by month: lessons,
                    music, live classes. */}
                <ActivityChart
                  buckets={activityBuckets}
                  granularity="month"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        <T en="Last class" pt="Última aula" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lastClassDate ? (
                        <p className="text-sm font-semibold">
                          <T
                            en={new Date(lastClassDate).toLocaleDateString(
                              "en-US",
                              {
                                timeZone: "America/Sao_Paulo",
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                            pt={new Date(lastClassDate).toLocaleDateString(
                              "pt-BR",
                              {
                                timeZone: "America/Sao_Paulo",
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          />
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          <T
                            en="No classes logged yet."
                            pt="Nenhuma aula registrada ainda."
                          />
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  {startingDate ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Flame className="h-4 w-4 text-amber-500" />
                          <T en="Days with us" pt="Dias conosco" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-2xl font-semibold tabular-nums">
                          {(daysStudying ?? 0).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <T
                            en={`Since ${startingDate}`}
                            pt={`Desde ${startingDate}`}
                          />
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <T en="Recent activity" pt="Atividade recente" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentCompletions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <T
                          en="No lessons completed yet."
                          pt="Ainda sem lições concluídas."
                        />
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {recentCompletions.map((c) => (
                          <li
                            key={c.lesson_slug}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate font-medium">
                              {humanize(c.lesson_slug)}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                              <T
                                en={new Date(c.completed_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    timeZone: "America/Sao_Paulo",
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )}
                                pt={new Date(c.completed_at).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    timeZone: "America/Sao_Paulo",
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {pendingAssignments.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <T en="Pending lessons" pt="Lições pendentes" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {pendingAssignments.map((slug) => (
                          <li key={slug} className="truncate font-medium">
                            {humanize(slug)}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4 text-primary" />
                      <T
                        en={`Badges · ${badges.length}`}
                        pt={`Medalhas · ${badges.length}`}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {badges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <T
                          en="No badges earned yet."
                          pt="Ainda não conquistou nenhuma medalha."
                        />
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {badges.map((b, i) => (
                          <BadgeChip
                            key={`${b.badge_type}-${i}`}
                            type={b.badge_type}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {liveClasses.totalMinutes > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        <T en="Live class hours" pt="Horas de aula ao vivo" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 grid-cols-2">
                        <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <T en="Total" pt="Total" />
                          </p>
                          <p className="mt-1 text-base font-semibold tabular-nums">
                            {formatHoursMinutes(liveClasses.totalMinutes)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <T en="This month" pt="Este mês" />
                          </p>
                          <p className="mt-1 text-base font-semibold tabular-nums">
                            {formatHoursMinutes(liveClasses.thisMonthMinutes)}
                          </p>
                        </div>
                      </div>
                      {Object.keys(liveClasses.bySkill).length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <T en="By skill" pt="Por habilidade" />
                          </p>
                          <ul className="space-y-1 text-sm">
                            {Object.entries(liveClasses.bySkill)
                              .sort((a, b) => b[1] - a[1])
                              .map(([skill, minutes]) => (
                                <li
                                  key={skill}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="font-medium capitalize">
                                    {skill}
                                  </span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {formatHoursMinutes(minutes)}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Profile</h1>
              <p className="text-sm text-muted-foreground">
                <T
                  en="How the student sees this page. Read-only."
                  pt={`Como ${isFemale ? "a" : "o"} ${studentWord} vê essa página. Somente leitura.`}
                />
              </p>
            </div>

            <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <AvatarDisplay
              fullName={student.full_name}
              signedUrl={avatarUrl}
              className="h-24 w-24"
            />
            <div className="space-y-1">
              <p className="text-base font-semibold">{student.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {student.age_group ? `${student.age_group} · ` : ""}
                {student.gender ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              <T en="Location" pt="Localização" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileLocation ? (
              <p className="text-sm font-medium">{profileLocation}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <T
                  en="The student hasn't set a location yet."
                  pt={`${isFemale ? "A" : "O"} ${studentWord} ainda não preencheu a localização.`}
                />
              </p>
            )}
          </CardContent>
        </Card>

        {startingDate ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <T en="Starting date" pt="Data de início" />
                  </p>
                  <p className="mt-0.5 text-base font-semibold">
                    {startingDate}
                  </p>
                  {daysStudying !== null ? (
                    <p className="text-xs text-muted-foreground">
                      <T
                        en={`${daysStudying.toLocaleString("en-US")} days with us`}
                        pt={`${daysStudying.toLocaleString("pt-BR")} dias conosco`}
                      />
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <T en="Last day" pt="Último dia" />
                  </p>
                  <p className="mt-0.5 text-base font-semibold">
                    {endDate ?? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        <T en="Active" pt="Ativo" />
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <CertificatesPanel
          rosterStudentId={id}
          studentName={student.full_name}
          defaultStartOn={startingDateIso ?? new Date().toISOString()}
          certificates={certificates}
          readOnly
        />

            <CefrExplainerCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KpiTile({
  icon,
  tone,
  label,
  value,
  small = false,
}: {
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "violet" | "rose" | "amber";
  label: React.ReactNode;
  value: React.ReactNode;
  small?: boolean;
}) {
  const toneClass: Record<typeof tone, string> = {
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={`truncate font-semibold tabular-nums ${small ? "text-sm" : "text-lg"}`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function humanize(slug: string): string {
  if (slug.startsWith("music:")) {
    const title = slug.slice("music:".length);
    return title
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
