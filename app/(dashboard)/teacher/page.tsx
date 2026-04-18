import Link from "next/link";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Music2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { AddClassroomButton } from "@/components/teacher/add-classroom-button";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherOverview } from "@/lib/actions/teacher-dashboard";
import {
  ClassroomCard,
  AddClassroomCard,
} from "@/components/teacher/classroom-card";
import { RosterCard } from "@/components/teacher/roster-card";
import { AddStudentButton } from "@/components/teacher/add-student-button";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { BirthdayAlert } from "@/components/teacher/birthday-alert";
import { DismissibleHero } from "@/components/teacher/dismissible-hero";
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { getUpcomingBirthdays } from "@/lib/actions/birthdays";
import { listMusic } from "@/lib/content/music";
import {
  TeacherSectionLabels,
  TeacherI18nClient,
} from "@/components/teacher/section-labels";

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const [
    { classrooms, roster, kpis, recentAssignments },
    publishedLessons,
    upcomingBirthdays,
  ] = await Promise.all([
    getTeacherOverview(),
    getAssignableLessons(),
    getUpcomingBirthdays(14),
  ]);
  const musics = listMusic();

  const resolvedRecent = recentAssignments.map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lessonSlug);
    if (kind === "music") {
      const m = getMusic(slug);
      return {
        ...a,
        kind,
        slug,
        title: m ? `${m.artist} — ${m.title}` : slug,
        cefr: m?.cefr_level ?? null,
        category: "music",
        minutes: m ? Math.max(5, Math.round((m.duration_seconds / 60) * 2)) : null,
      };
    }
    const draft = publishedLessons.find((l) => l.slug === slug);
    const fileMeta = findLessonMeta(slug);
    return {
      ...a,
      kind: "lesson" as const,
      slug,
      title: draft?.title ?? fileMeta?.title ?? slug,
      cefr: (draft?.cefr_level ?? fileMeta?.cefr_level) ?? null,
      category: draft?.category ?? fileMeta?.category ?? null,
      minutes: fileMeta?.estimated_minutes ?? null,
    };
  });
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const classroomOptions = classrooms.map((c) => ({ id: c.id, name: c.name }));
  const studentOptions = roster.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    classroomId: r.classroomId,
  }));

  return (
    <div className="space-y-10 pb-16">
      {/* Welcome hero FIRST */}
      <DismissibleHero firstName={firstName} classrooms={classroomOptions} />

      {/* Birthday alert — only renders when there are upcoming birthdays */}
      <BirthdayAlert birthdays={upcomingBirthdays} />

      {/* KPI STRIP — below hero */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <KpiTile
          label="Students"
          labelPt="Alunos"
          value={kpis.students}
          hint="across classrooms + roster"
          hintPt="em turmas + lista"
          accent="indigo"
          Icon={Users}
        />
        <KpiTile
          label="Lessons assigned"
          labelPt="Lições atribuídas"
          value={kpis.lessonsAssigned}
          hint="across all classrooms"
          hintPt="em todas as turmas"
          accent="sky"
          Icon={ClipboardList}
        />
        <KpiTile
          label="Lessons completed"
          labelPt="Lições concluídas"
          value={kpis.lessonsCompleted}
          hint="by students so far"
          hintPt="por alunos até agora"
          accent="emerald"
          Icon={CheckCircle2}
        />
      </section>

      {/* STUDENTS first — roster cards first, + card last */}
      <section aria-labelledby="students-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2
              id="students-heading"
              className="text-xl font-bold tracking-tight"
            >
              <TeacherSectionLabels keyName="students" />
            </h2>
            {roster.length > 0 ? (
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {roster.length}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <AssignLessonButton
              lessons={publishedLessons}
              musics={musics}
              classrooms={classroomOptions}
              students={studentOptions}
              variant="subtle"
            />
            <AddStudentButton classrooms={classroomOptions} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {roster.map((r, i) => (
            <RosterCard
              key={r.id}
              id={r.id}
              fullName={r.fullName}
              classroomName={r.classroomName}
              avatarUrl={r.avatarUrl}
              accentIndex={i}
              ageGroup={r.ageGroup}
              gender={r.gender}
            />
          ))}
          <AddStudentButton classrooms={classroomOptions} variant="card" />
        </div>
      </section>

      {/* CLASSROOMS second — classroom cards first, + card last */}
      <section aria-labelledby="classrooms-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <h2
              id="classrooms-heading"
              className="text-xl font-bold tracking-tight"
            >
              <TeacherSectionLabels keyName="classrooms" />
            </h2>
            {classrooms.length > 0 ? (
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {classrooms.length}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <AddClassroomButton />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {classrooms.map((c, i) => (
            <ClassroomCard
              key={c.id}
              id={c.id}
              name={c.name}
              description={c.description}
              inviteCode={c.inviteCode}
              studentCount={c.studentCount}
              accentIndex={i}
            />
          ))}
          <AddClassroomCard />
        </div>
      </section>

      {resolvedRecent.length > 0 ? (
        <section aria-labelledby="recent-heading" className="space-y-3">
          <h2 id="recent-heading" className="text-xl font-bold tracking-tight">
            <TeacherI18nClient en="Recent assignments" pt="Atribuições recentes" />
          </h2>
          <ul className="space-y-2">
            {resolvedRecent.map((a) => {
              const href =
                a.kind === "music"
                  ? `/student/music/${a.slug}`
                  : `/student/lessons/${a.slug}`;
              return (
                <li
                  key={a.assignmentId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs"
                >
                  {a.kind === "music" ? (
                    <Music2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="truncate text-sm font-semibold hover:text-primary"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      {a.cefr ? <span>{a.cefr.toUpperCase()}</span> : null}
                      {a.cefr && a.category ? <span>·</span> : null}
                      {a.category ? <span>{a.category}</span> : null}
                      {a.minutes ? <span>·</span> : null}
                      {a.minutes ? (
                        <span className="tabular-nums">{a.minutes} min</span>
                      ) : null}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {a.scope === "classroom-wide" ? (
                          <Users className="h-3 w-3" />
                        ) : (
                          <UserRound className="h-3 w-3" />
                        )}
                        {a.scope === "classroom-wide"
                          ? `Whole class (${a.classroomName})`
                          : `Assigned to ${a.targetStudentName ?? "student"}`}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(a.assignedAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.status === "completed"
                        ? "default"
                        : a.status === "skipped"
                          ? "outline"
                          : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {a.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function KpiTile({
  label,
  labelPt,
  value,
  hint,
  hintPt,
  accent,
  Icon,
}: {
  label: string;
  labelPt: string;
  value: number;
  hint: string;
  hintPt: string;
  accent: "indigo" | "sky" | "emerald";
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const colorMap = {
    indigo: {
      bg: "from-indigo-500/15 to-indigo-500/5",
      fg: "text-indigo-600 dark:text-indigo-400",
      ringBg: "bg-indigo-500/10",
    },
    sky: {
      bg: "from-sky-500/15 to-sky-500/5",
      fg: "text-sky-600 dark:text-sky-400",
      ringBg: "bg-sky-500/10",
    },
    emerald: {
      bg: "from-emerald-500/15 to-emerald-500/5",
      fg: "text-emerald-600 dark:text-emerald-400",
      ringBg: "bg-emerald-500/10",
    },
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorMap.bg} opacity-60`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TeacherI18nClient en={label} pt={labelPt} />
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <TeacherI18nClient en={hint} pt={hintPt} />
          </p>
        </div>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${colorMap.ringBg} ${colorMap.fg}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
