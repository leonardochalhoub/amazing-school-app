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
import { Card, CardContent } from "@/components/ui/card";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import { CuteArtBadge } from "@/components/student/cute-art";
import { getStudentStats } from "@/lib/actions/gamification";
import { getAssignmentsForStudent } from "@/lib/actions/assignments";
import { touchDailyActivity } from "@/lib/actions/daily-activity";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { getAvatarSignedUrls } from "@/lib/supabase/signed-urls";
import { getLevel, getXpForNextLevel } from "@/lib/gamification/engine";
import { BadgeChip } from "@/components/gamification/badge-chip";
import {
  ActivityChart,
  type ActivityBucket,
} from "@/components/student/activity-chart";
import { MyClassesPanel } from "@/components/student/my-classes-panel";
import { AssignmentsGrid } from "@/components/student/assignments-grid";
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
  completedAt: string | null;
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

  // Only redirect real teachers/owners back to their dashboard —
  // a profile flagged 'teacher' that is ALSO referenced by a roster
  // row is a mis-roled student (signup slipped through the default),
  // and should be treated as a student. The dashboard layout also
  // self-heals the role on the fly, but we check here too so this
  // page doesn't redirect before the layout's update commits.
  if (profile?.role === "teacher" || profile?.role === "owner") {
    const { data: asStudent } = await admin
      .from("roster_students")
      .select("id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!asStudent) redirect("/teacher");
  }

  let { data: rosterSelf } = await admin
    .from("roster_students")
    .select("id, age_group, gender, has_avatar, level")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  // Rosângela-style fallback: if the roster row hasn't been linked yet
  // (invitation was never claimed, or teacher created the roster without
  // an invite), try matching by email. A match auto-links, so subsequent
  // loads use the faster auth_user_id path.
  if (!rosterSelf && user.email) {
    const { data: byEmail } = await admin
      .from("roster_students")
      .select("id, age_group, gender, has_avatar, level")
      .eq("email", user.email)
      .is("auth_user_id", null)
      .is("deleted_at", null)
      .maybeSingle();
    if (byEmail?.id) {
      await admin
        .from("roster_students")
        .update({ auth_user_id: user.id })
        .eq("id", byEmail.id)
        .is("auth_user_id", null);
      rosterSelf = byEmail;
    }
  }

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

  // Completion timestamps for every lesson this student has ever
  // finished — used to surface "Done on dd/mm hh:mm" on assignment
  // cards. Keyed by lesson_slug (same key the assignments table uses).
  // We take the most recent completion per slug if they happen to have
  // finished the same lesson twice.
  const { data: allCompletions } = await admin
    .from("lesson_progress")
    .select("lesson_slug, completed_at")
    .eq("student_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    // Supabase's default select cap is 1000 — an active student can
    // blow past that across a long enrollment. Set a generous ceiling
    // so the chart never silently drops the oldest history.
    .limit(10_000);
  const completedAtBySlug = new Map<string, string>();
  for (const c of (allCompletions ?? []) as Array<{
    lesson_slug: string;
    completed_at: string;
  }>) {
    if (!completedAtBySlug.has(c.lesson_slug)) {
      completedAtBySlug.set(c.lesson_slug, c.completed_at);
    }
  }

  let resolvedAssignments: ResolvedAssignment[] = [];
  {
    const raw = await getAssignmentsForStudent(classroomId, user.id);
    resolvedAssignments = raw.map((a) => {
      const { kind, slug } = fromAssignmentSlug(a.lesson_slug);
      const completedAt = completedAtBySlug.get(a.lesson_slug) ?? null;
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
          completedAt,
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
        completedAt,
      };
    });
  }

  const active = resolvedAssignments
    .filter((a) => a.status !== "skipped")
    // Newest assignment first so what the teacher just pushed is at
    // the top of the grid instead of buried behind months-old work.
    .sort((a, b) => (b.assignedAt ?? "").localeCompare(a.assignedAt ?? ""));
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

  // Activity chart — 24 monthly buckets ending on the current
  // month, stacked lessons (indigo) + music (pink). Aggregating by
  // month turns the chart from a 730-bar matchstick forest into a
  // readable bar chart where bar height reflects monthly volume.
  // All times resolve in Brazil local time (UTC-3) so a completion
  // just after midnight local still lands in the right month.
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const MONTHS = 24;
  const now = new Date(Date.now() + BRT_OFFSET_MS);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const activityBuckets: ActivityBucket[] = [];
  const bucketIndexByKey = new Map<string, number>();
  for (let i = MONTHS - 1; i >= 0; i--) {
    let y = currentYear;
    let m = currentMonth - i;
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
    });
  }

  function monthKey(d: Date): string {
    // Shift into BRT before extracting year/month so completions at
    // 22:30 BRT on Jan 31 don't leak into February.
    const brt = new Date(d.getTime() + BRT_OFFSET_MS);
    return `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  // Activity events come from two sources, merged:
  //   1. lesson_progress rows — canonical "student finished X at T".
  //   2. Assignment rows with status="completed" that have no
  //      matching lesson_progress (demo seed edge cases + legacy).
  //      Fallback to assigned_at as the event date.
  const slugsWithProgress = new Set<string>();
  for (const c of allCompletions ?? []) {
    const row = c as { lesson_slug: string; completed_at: string };
    const idx = bucketIndexByKey.get(monthKey(new Date(row.completed_at)));
    slugsWithProgress.add(row.lesson_slug);
    if (idx === undefined) continue;
    if (row.lesson_slug.startsWith("music:")) activityBuckets[idx].music++;
    else activityBuckets[idx].lessons++;
  }
  for (const a of resolvedAssignments) {
    if (a.status !== "completed") continue;
    const fullSlug = a.kind === "music" ? `music:${a.slug}` : a.slug;
    if (slugsWithProgress.has(fullSlug)) continue;
    const idx = bucketIndexByKey.get(monthKey(new Date(a.assignedAt)));
    if (idx === undefined) continue;
    if (a.kind === "music") activityBuckets[idx].music++;
    else activityBuckets[idx].lessons++;
  }

  // Fetch a larger window so the MyClassesPanel "Show all" toggle has
  // meaningful history to reveal. It still renders the most-recent 3
  // by default.
  const ownHistory = await listOwnHistory(200);
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

        {/* Decorative cute art for female students. Re-seeds per
            page render via Math.random so every reload picks a
            different motif (dogs, pandas, flowers, makeup, sweets…). */}
        {rosterSelf?.gender === "female" ? (
          <div className="pointer-events-none absolute -top-4 right-4 md:right-10">
            <CuteArtBadge
              seed={Math.floor(Math.random() * 1_000_000)}
              size={140}
            />
          </div>
        ) : null}
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

          <div className="flex-1 min-w-0 space-y-3">
            <div className="min-w-0">
              {(rosterSelf as { level?: string | null } | null)?.level ? (
                <p className="mb-1 inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  {(rosterSelf as { level: string }).level.toUpperCase()}
                </p>
              ) : null}
              <h1
                className="break-words font-[family-name:var(--font-display)] text-3xl italic leading-tight tracking-tight md:text-4xl"
                style={{ letterSpacing: "-0.01em" }}
              >
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">
                  Hi, {firstName}
                </span>
              </h1>
            </div>

            {/* XP progress bar — `progress` from getXpForNextLevel is
                already a percentage (0..100), so no extra *100 here. */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Level {level} · {totalXp} XP
                </span>
                <span className="text-muted-foreground">
                  {currentLevelXp} / {nextLevelXp} to Lv {level + 1}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-[width] duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>

            {/* Earned badges — rendered inline in the hero so the
                student sees the medals the moment they land. Each
                chip uses the badge's own gradient + glow from the
                catalog so rarity reads at a glance. Unknown / stale
                types fall through gracefully. */}
            {stats?.earnedBadges && stats.earnedBadges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {stats.earnedBadges.map((type) => (
                  <BadgeChip key={type} type={type} />
                ))}
              </div>
            ) : null}
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
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {today.kind === "music" ? (
                    <Music2 className="h-5 w-5" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Start here today
                  </p>
                  <p className="break-words text-lg font-semibold">{today.title}</p>
                  <p className="break-words text-xs text-muted-foreground">
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
          <AssignmentsGrid
            entries={active.map((a) => ({
              assignmentId: a.assignmentId,
              kind: a.kind,
              title: a.title,
              subtitle: a.subtitle,
              cefrLevel: a.cefrLevel,
              minutes: a.minutes,
              status: a.status,
              href: a.href,
              assignedAt: a.assignedAt,
              completedAt: a.completedAt,
            }))}
          />
        )}
      </section>

      {/* LISTENING FEEDBACK ====================================== */}
      <ListeningFeedbackPanel entries={listeningResponses} />

      {/* ACTIVITY CHART =========================================== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Your activity</h2>
        <ActivityChart buckets={activityBuckets} granularity="month" />
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

