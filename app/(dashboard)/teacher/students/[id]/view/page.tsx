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
  assignedCount = allAssignments.length;
  completedCount = allAssignments.filter((a) => a.status === "completed")
    .length;
  pendingAssignments = allAssignments
    .filter((a) => a.status !== "completed")
    .slice(0, 5)
    .map((a) => a.lesson_slug);

  if (studentAuthId) {
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

      <div className="mx-auto max-w-2xl">
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
            <div>
              <h1 className="text-2xl font-bold">
                <T en="Hi, " pt="Olá, " />
                {student.full_name.split(" ")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">
                <T
                  en={`Overview the student sees. Read-only.`}
                  pt={`Resumo que ${isFemale ? "a" : "o"} ${studentWord} vê ao entrar. Somente leitura.`}
                />
              </p>
            </div>

            {/* XP + level summary */}
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                  <Zap className="h-7 w-7" />
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <T en="Level · XP" pt="Nível · XP" />
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    Lv.{level} · {totalXp.toLocaleString("pt-BR")} XP
                  </p>
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
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    <T
                      en={`${Math.max(0, xpProg.needed - xpProg.current)} XP to next level`}
                      pt={`Faltam ${Math.max(0, xpProg.needed - xpProg.current)} XP para o próximo nível`}
                    />
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Assignments + activity KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <T en="Assigned lessons" pt="Lições atribuídas" />
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {assignedCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <T en="Completed" pt="Concluídas" />
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {completedCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Flame className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <T en="Active days · 30d" pt="Dias ativos · 30d" />
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {daysActiveLast30}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <T en="Next class" pt="Próxima aula" />
                    </p>
                    <p className="text-sm font-semibold">
                      {nextClassDate ? (
                        <T
                          en={new Date(nextClassDate).toLocaleDateString(
                            "en-US",
                            {
                              timeZone: "America/Sao_Paulo",
                              day: "2-digit",
                              month: "short",
                            },
                          )}
                          pt={new Date(nextClassDate).toLocaleDateString(
                            "pt-BR",
                            {
                              timeZone: "America/Sao_Paulo",
                              day: "2-digit",
                              month: "short",
                            },
                          )}
                        />
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Last class + recent activity side-by-side */}
            <div className="grid gap-3 lg:grid-cols-2">
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
            </div>

            {/* Pending assignments preview */}
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

            {/* Badges */}
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

            {/* Live-class hours — total + this month + per-skill split */}
            {liveClasses.totalMinutes > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <T en="Live class hours" pt="Horas de aula ao vivo" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <T en="Total" pt="Total" />
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {formatHoursMinutes(liveClasses.totalMinutes)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <T en="This month" pt="Este mês" />
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
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
                              <span className="font-medium">{skill}</span>
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

            {/* Starting date */}
            {startingDate ? (
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Flame className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <T en="Days with us" pt="Dias conosco" />
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {(daysStudying ?? 0).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
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
