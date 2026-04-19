import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Music2,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import { getStudentStats } from "@/lib/actions/gamification";
import { getStudentClassrooms } from "@/lib/actions/classroom";
import { getAssignmentsForStudent } from "@/lib/actions/assignments";
import { touchDailyActivity } from "@/lib/actions/daily-activity";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { getAvatarSignedUrls } from "@/lib/supabase/signed-urls";
import { getLevel, getXpForNextLevel } from "@/lib/gamification/engine";
import {
  ActivityChart,
  type ActivityBucket,
} from "@/components/student/activity-chart";
import { MyClassesPanel } from "@/components/student/my-classes-panel";
import { listOwnHistory } from "@/lib/actions/student-history";
import { ListeningFeedbackPanel } from "@/components/student/listening-feedback-panel";
import { listStudentListeningResponses } from "@/lib/actions/listening-responses";

interface ResolvedAssignment {
  assignmentId: string;
  kind: "lesson" | "music";
  slug: string;
  title: string;
  subtitle: string | null;
  cefrLevel: string | null;
  minutes: number | null;
  status: "assigned" | "skipped" | "completed";
  scope: "classroom-wide" | "per-student";
  href: string;
  assignedAt: string;
}

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Stamp today as active for streak counting.
  await touchDailyActivity();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "teacher") redirect("/teacher");

  const { data: rosterSelf } = await admin
    .from("roster_students")
    .select("id, age_group, gender, has_avatar, level")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const stats = await getStudentStats(user.id);

  // Auto-claim: if this student has a pending invitation matching their
  // email (e.g. they signed up directly instead of clicking the invite
  // link), link them up transparently on first load.
  if (user.email) {
    const { data: pending } = await admin
      .from("student_invitations")
      .select("id, classroom_id, roster_student_id")
      .eq("email", user.email)
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    const inv = pending?.[0] as
      | {
          id: string;
          classroom_id: string;
          roster_student_id: string | null;
        }
      | undefined;
    if (inv) {
      if (inv.roster_student_id) {
        await admin
          .from("roster_students")
          .update({ auth_user_id: user.id })
          .eq("id", inv.roster_student_id);
      }
      await admin
        .from("classroom_members")
        .upsert(
          { classroom_id: inv.classroom_id, student_id: user.id },
          { onConflict: "classroom_id,student_id" }
        );
      await admin
        .from("student_invitations")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: user.id,
        })
        .eq("id", inv.id);
    }
  }

  // Robust classroom lookup — prefer an actual classroom_members row, but
  // fall back to the roster_students.classroom_id if the membership row is
  // missing (common right after an invite claim, before cache refresh).
  const { data: membership } = await admin
    .from("classroom_members")
    .select("classroom_id, classrooms(id, name)")
    .eq("student_id", user.id)
    .limit(1)
    .maybeSingle();

  let classroomId: string | null = null;
  if (membership) {
    const c = (membership as {
      classroom_id: string;
      classrooms: { id: string; name: string } | { id: string; name: string }[] | null;
    }).classrooms;
    const flat = Array.isArray(c) ? c[0] : c;
    classroomId = flat?.id ?? (membership as { classroom_id: string }).classroom_id;
  }
  if (!classroomId && rosterSelf) {
    const { data: rosterRow } = await admin
      .from("roster_students")
      .select("classroom_id")
      .eq("id", (rosterSelf as { id: string }).id)
      .maybeSingle();
    const cid = (rosterRow as { classroom_id: string | null } | null)?.classroom_id ?? null;
    if (cid) classroomId = cid;
  }

  // Avatar resolution order: user's own upload → roster avatar the teacher
  // set before the student signed up → cartoon fallback.
  let avatarUrl: string | null = null;
  if (profile?.avatar_url) {
    const signed = await getAvatarSignedUrls(supabase, [user.id]);
    avatarUrl = signed[user.id] ?? null;
  }
  if (!avatarUrl && rosterSelf?.has_avatar && rosterSelf.id) {
    const { getRosterAvatarSignedUrl } = await import("@/lib/actions/roster");
    avatarUrl = await getRosterAvatarSignedUrl(rosterSelf.id as string);
  }

  let resolvedAssignments: ResolvedAssignment[] = [];
  {
    const raw = await getAssignmentsForStudent(classroomId, user.id);
    resolvedAssignments = raw.map((a) => {
      const { kind, slug } = fromAssignmentSlug(a.lesson_slug);
      if (kind === "music") {
        const m = getMusic(slug);
        return {
          assignmentId: a.id,
          kind: "music" as const,
          slug,
          title: m ? `${m.artist} — ${m.title}` : slug,
          subtitle: m ? m.genre.join(" · ") : null,
          cefrLevel: m?.cefr_level ?? null,
          minutes: m
            ? Math.max(5, Math.round((m.duration_seconds / 60) * 2))
            : null,
          status: a.status,
          scope:
            a.student_id === null &&
            (a as unknown as { roster_student_id: string | null })
              .roster_student_id === null
              ? "classroom-wide"
              : "per-student",
          href: `/student/music/${slug}`,
          assignedAt: a.assigned_at,
        };
      }
      const meta = findLessonMeta(slug);
      return {
        assignmentId: a.id,
        kind: "lesson" as const,
        slug,
        title: meta?.title ?? slug,
        subtitle: meta?.category ?? null,
        cefrLevel: meta?.cefr_level ?? null,
        minutes: meta?.estimated_minutes ?? null,
        status: a.status,
        scope:
          a.student_id === null &&
          (a as unknown as { roster_student_id: string | null })
            .roster_student_id === null
            ? "classroom-wide"
            : "per-student",
        href: `/student/lessons/${slug}`,
        assignedAt: a.assigned_at,
      };
    });
  }

  const active = resolvedAssignments.filter((a) => a.status !== "skipped");
  const notDone = active.filter((a) => a.status !== "completed");
  const completedCount = active.filter((a) => a.status === "completed").length;
  const totalCount = active.length;
  const pct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = notDone[0] ?? null;

  // Level progress
  const totalXp = stats?.totalXp ?? 0;
  const level = getLevel(totalXp);
  const { current: currentLevelXp, needed: nextLevelXp, progress } =
    getXpForNextLevel(totalXp);
  const streak = stats?.streak ?? 0;

  const firstName =
    profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  // Activity chart — 60 daily buckets ending today in Brazil local time
  // (America/Sao_Paulo, UTC-3). Vercel runs UTC, dev may run anywhere —
  // pin the display TZ so a completion at 22:00 BRT doesn't slide to the
  // next day's UTC bucket.
  const DAYS = 60;
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const msPerDay = 24 * 60 * 60 * 1000;
  // Convert real-time UTC to a "BRT-naive" timestamp, then truncate to the
  // BRT calendar day. rangeStart is a UTC Date whose toISOString().slice(0,10)
  // reads as the BRT calendar date.
  const brtToday = new Date(
    Math.floor((Date.now() + BRT_OFFSET_MS) / msPerDay) * msPerDay
  );
  const rangeStart = new Date(brtToday.getTime() - (DAYS - 1) * msPerDay);

  const { data: completions } = await admin
    .from("lesson_progress")
    .select("lesson_slug, completed_at")
    .eq("student_id", user.id)
    .not("completed_at", "is", null)
    .gte("completed_at", new Date(rangeStart.getTime() - BRT_OFFSET_MS).toISOString());

  const activityBuckets: ActivityBucket[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(rangeStart.getTime() + i * msPerDay);
    activityBuckets.push({
      start: d.toISOString().slice(0, 10),
      lessons: 0,
      music: 0,
    });
  }
  for (const c of completions ?? []) {
    const t = new Date(c.completed_at as string);
    const tDay =
      Math.floor((t.getTime() + BRT_OFFSET_MS) / msPerDay) * msPerDay;
    const idx = Math.floor((tDay - rangeStart.getTime()) / msPerDay);
    if (idx < 0 || idx >= activityBuckets.length) continue;
    const isMusic = (c.lesson_slug as string).startsWith("music:");
    if (isMusic) activityBuckets[idx].music++;
    else activityBuckets[idx].lessons++;
  }

  const ownHistory = await listOwnHistory(5);
  const listeningResponses = await listStudentListeningResponses(10);

  return (
    <div className="space-y-8 overflow-x-clip pb-16">
      {/* HERO ===================================================== */}
      <section
        className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgb(147 51 234 / 0.12), transparent 60%), radial-gradient(ellipse at bottom left, rgb(59 130 246 / 0.12), transparent 60%)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-muted shadow-lg ring-4 ring-background md:h-28 md:w-28">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={profile?.full_name ?? "You"}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <CartoonAvatar
                  ageGroup={rosterSelf?.age_group as "kid" | "teen" | "adult" | null}
                  gender={rosterSelf?.gender as "female" | "male" | null}
                  seed={user.id}
                  fullName={profile?.full_name ?? null}
                />
              )}
            </div>
            {/* Level ring */}
            <div
              className="absolute -bottom-1 -right-1 inline-flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-2 text-xs font-bold text-white shadow-lg"
              title={`Level ${level}`}
            >
              {level}
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              {(rosterSelf as { level?: string | null } | null)?.level ? (
                <p className="mb-1 inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  {(rosterSelf as { level: string }).level.toUpperCase()}
                </p>
              ) : null}
              <h1
                className="font-[family-name:var(--font-display)] text-3xl italic leading-tight tracking-tight md:text-4xl"
                style={{ letterSpacing: "-0.01em" }}
              >
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">
                  Hi, {firstName}
                </span>
              </h1>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {totalXp} XP
                </span>
                <span className="text-muted-foreground">
                  {currentLevelXp}/{nextLevelXp} to level {level + 1}
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-[width] duration-700"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:flex-col md:gap-3">
            <StatChip
              icon={Flame}
              iconClass="text-amber-500"
              value={streak}
              label={streak === 1 ? "day" : "days"}
              sub="streak"
            />
            <StatChip
              icon={Star}
              iconClass="text-violet-500"
              value={stats?.lessonsCompleted ?? 0}
              label={(stats?.lessonsCompleted ?? 0) === 1 ? "lesson" : "lessons"}
              sub="done"
            />
          </div>
        </div>
      </section>

      {/* MY CLASSES =============================================== */}
      <MyClassesPanel entries={ownHistory} />

      {/* TODAY CARD =============================================== */}
      {today ? (
        <Link href={today.href} className="group block">
          <Card className="relative overflow-hidden border-primary/30">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 transition-opacity group-hover:opacity-80"
            />
            <CardContent className="relative flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {today.kind === "music" ? (
                    <Music2 className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Start here today
                  </p>
                  <p className="text-lg font-semibold">{today.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {today.cefrLevel ? today.cefrLevel.toUpperCase() : "—"}
                    {today.subtitle ? ` · ${today.subtitle}` : ""}
                    {today.minutes ? ` · ${today.minutes} min` : ""}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/60 px-4 py-1.5 text-sm font-medium transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : totalCount > 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">All caught up!</p>
              <p className="text-xs text-muted-foreground">
                You&apos;ve finished every assignment. Check back tomorrow.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ASSIGNED LIST =========================================== */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Assigned to you
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {active.length}
            </span>
          </h2>
          {totalCount > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{totalCount} · {pct}%
            </span>
          ) : null}
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">No assignments yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your teacher hasn&apos;t sent anything your way yet. Check back
              soon.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {active.map((a) => (
              <li key={a.assignmentId}>
                <AssignmentTile a={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* LISTENING FEEDBACK ====================================== */}
      <ListeningFeedbackPanel entries={listeningResponses} />

      {/* ACTIVITY CHART =========================================== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Your activity</h2>
        <ActivityChart buckets={activityBuckets} granularity="day" />
      </section>
    </div>
  );
}

function StatChip({
  icon: Icon,
  iconClass,
  value,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  value: number;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 py-1.5 shadow-xs">
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <div className="leading-none">
        <p className="text-sm font-bold tabular-nums">
          {value} <span className="text-[10px] font-normal text-muted-foreground">{label}</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {sub}
        </p>
      </div>
    </div>
  );
}

function AssignmentTile({ a }: { a: ResolvedAssignment }) {
  const isDone = a.status === "completed";
  return (
    <Link href={a.href} className="group block">
      <Card
        className={`transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
          isDone ? "opacity-70" : ""
        }`}
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : a.kind === "music"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {a.kind === "music" ? (
                  <Music2 className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {a.title}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-muted-foreground">
                  {a.cefrLevel ? <span>{a.cefrLevel.toUpperCase()}</span> : null}
                  {a.subtitle ? (
                    <>
                      <span>·</span>
                      <span>{a.subtitle}</span>
                    </>
                  ) : null}
                  {a.minutes ? (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{a.minutes} min</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            {isDone ? (
              <Badge variant="default" className="text-[10px]">
                Done
              </Badge>
            ) : null}
          </div>
          <Button
            size="sm"
            variant={isDone ? "outline" : "default"}
            className="w-full gap-1.5 text-xs"
          >
            {isDone ? "Review" : "Open"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
