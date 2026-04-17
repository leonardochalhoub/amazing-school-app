"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Music2,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DEMO_CLASSROOMS, DEMO_STUDENTS } from "@/lib/demo-data";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n/context";

function demoToast() {
  toast.info("This is a live demo. Sign up to save real changes.", {
    action: { label: "Sign up", onClick: () => { window.location.href = "/login"; } },
  });
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const RECENT_ASSIGNMENTS = DEMO_STUDENTS
  .flatMap((s) =>
    s.assigned.map((a) => ({
      ...a,
      studentId: s.id,
      studentName: s.preferredName ?? s.fullName,
      classroomName: s.classroomName,
    }))
  )
  .sort((a, b) => (a.assignedAt > b.assignedAt ? -1 : 1))
  .slice(0, 6);

export default function DemoTeacherPage() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const lessonsAssigned = DEMO_STUDENTS.reduce((s, st) => s + st.assigned.length, 0);
  const lessonsCompleted = DEMO_STUDENTS.reduce(
    (s, st) => s + st.assigned.filter((a) => a.status === "completed").length,
    0
  );

  return (
    <>
      <DemoBanner backHref="/" backLabel="Back to home" />

      <header className="border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <span
              className="hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-2xl italic leading-none text-transparent sm:inline dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.015em" }}
            >
              Amazing School
            </span>
          </Link>
          <nav className="hidden md:flex">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 text-xs font-medium">
              <Link
                href="/demo/lessons"
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
              >
                Lessons
              </Link>
              <Link
                href="/demo/music"
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
              >
                Musics
              </Link>
            </div>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Badge
              variant="outline"
              className="hidden items-center gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 lg:inline-flex"
            >
              <Sparkles className="h-3 w-3" />
              Teacher · Demo
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="space-y-10 pb-16">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-pink-500/5 p-6 md:p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Teacher Dashboard
            </p>
            <h1
              className="mt-2 font-[family-name:var(--font-display)] text-4xl italic leading-tight tracking-tight text-foreground md:text-5xl"
              style={{ letterSpacing: "-0.01em" }}
            >
              {isPt ? "Bem-vindo, " : "Welcome back, "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">
                {isPt ? "professor Leo" : "teacher Leo"}
              </span>
              !
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {DEMO_STUDENTS.length}{" "}
              {isPt
                ? `alunos em ${DEMO_CLASSROOMS.length} turmas · clique em qualquer aluno, lição ou música para explorar a experiência completa.`
                : `students across ${DEMO_CLASSROOMS.length} classrooms · click any student, lesson, or song to explore the full experience.`}
            </p>
          </div>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile
              icon={Users}
              label={isPt ? "Alunos" : "Students"}
              value={DEMO_STUDENTS.length}
              hint={isPt ? "em turmas + lista" : "across classrooms + roster"}
              accent="indigo"
            />
            <KpiTile
              icon={ClipboardList}
              label={isPt ? "Lições atribuídas" : "Lessons assigned"}
              value={lessonsAssigned}
              hint={isPt ? "em todas as turmas" : "across all classrooms"}
              accent="sky"
            />
            <KpiTile
              icon={CheckCircle2}
              label={isPt ? "Lições concluídas" : "Lessons completed"}
              value={lessonsCompleted}
              hint={isPt ? "por alunos até agora" : "by students so far"}
              accent="emerald"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold tracking-tight">
                  {isPt ? "Alunos" : "Students"}
                </h2>
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {DEMO_STUDENTS.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={demoToast} className="gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {isPt ? "Atribuir lição" : "Assign lesson"}
                </Button>
                <Button size="sm" onClick={demoToast} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  {isPt ? "Adicionar aluno" : "Add student"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {DEMO_STUDENTS.map((s) => (
                <Link
                  key={s.id}
                  href={`/demo/teacher/students/${s.id}`}
                  className="group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted shadow-sm ring-2 ring-background">
                    <CartoonAvatar ageGroup={s.ageGroup} gender={s.gender} seed={s.id} fullName={s.fullName} />
                  </div>
                  <div className="relative min-w-0 w-full text-center">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {s.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {s.classroomName}
                    </p>
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      {s.totalXp} XP · {s.streak}d streak
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight">Classrooms</h2>
              <Button size="sm" onClick={demoToast} className="gap-1.5">
                <Plus className="h-4 w-4" />
                New classroom
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {DEMO_CLASSROOMS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={demoToast}
                  className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{c.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                    </div>
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {c.studentCount} students
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      {c.inviteCode}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight">Recent assignments</h2>
            <ul className="space-y-2">
              {RECENT_ASSIGNMENTS.map((a, i) => {
                const href =
                  a.kind === "music"
                    ? `/demo/music/${a.slug}`
                    : `/demo/lessons/${a.slug}`;
                return (
                  <li
                    key={`${a.studentId}-${a.slug}-${i}`}
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
                        <span>{a.cefrLevel.toUpperCase()}</span>
                        <span>·</span>
                        <span>{a.category}</span>
                        <span>·</span>
                        <span className="tabular-nums">{a.minutes} min</span>
                        <span>·</span>
                        <span>
                          Assigned to{" "}
                          <Link
                            href={`/demo/teacher/students/${a.studentId}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {a.studentName}
                          </Link>{" "}
                          · {formatWhen(a.assignedAt)}
                          {a.scope === "classroom-wide"
                            ? ` · whole class (${a.classroomName})`
                            : ""}
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
                    <Button size="sm" variant="ghost" onClick={demoToast} className="h-8 text-xs">
                      Skip
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 text-center md:p-10">
            <h3 className="text-2xl font-bold tracking-tight">Like what you see?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a free account and start teaching with real students.
            </p>
            <div className="mt-5 flex justify-center">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Sign up free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  accent: "indigo" | "sky" | "emerald";
}) {
  const colorMap = {
    indigo: { bg: "from-indigo-500/15 to-indigo-500/5", fg: "text-indigo-600 dark:text-indigo-400", ringBg: "bg-indigo-500/10" },
    sky: { bg: "from-sky-500/15 to-sky-500/5", fg: "text-sky-600 dark:text-sky-400", ringBg: "bg-sky-500/10" },
    emerald: { bg: "from-emerald-500/15 to-emerald-500/5", fg: "text-emerald-600 dark:text-emerald-400", ringBg: "bg-emerald-500/10" },
  }[accent];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorMap.bg} opacity-60`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${colorMap.ringBg} ${colorMap.fg}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
