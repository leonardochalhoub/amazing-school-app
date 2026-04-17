"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  ExternalLink,
  Flame,
  Music2,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDemoStudent } from "@/lib/demo-data";

function demoToast() {
  toast.info("This is a live demo. Sign up to save real changes.", {
    action: { label: "Sign up", onClick: () => { window.location.href = "/login"; } },
  });
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function DemoStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const student = getDemoStudent(id);
  if (!student) notFound();

  const progress =
    student.assigned.length > 0
      ? Math.round(
          (student.assigned.filter((a) => a.status === "completed").length /
            student.assigned.length) *
            100
        )
      : 0;

  return (
    <>
      <DemoBanner backHref="/demo/teacher" backLabel="Back to demo dashboard" />

      <header className="border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/demo/teacher" className="flex shrink-0 items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <span
              className="hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-2xl italic leading-none text-transparent sm:inline dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.015em" }}
            >
              Amazing School
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="space-y-6 pb-16">
          <Link
            href="/demo/teacher"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>

          <header className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Student
            </p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-muted ring-2 ring-background">
                <CartoonAvatar
                  ageGroup={student.ageGroup}
                  gender={student.gender}
                  seed={student.id}
                  fullName={student.fullName}
                />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {student.fullName}
                </h1>
                {student.email ? (
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base">
                    Assigned lessons & songs
                    <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                      {student.assigned.length}
                    </span>
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={demoToast} className="gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    Assign
                  </Button>
                </CardHeader>
                <CardContent>
                  {student.assigned.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No assignments yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {student.assigned.map((a, i) => {
                        const href =
                          a.kind === "music"
                            ? `/demo/music/${a.slug}`
                            : `/demo/lessons/${a.slug}`;
                        return (
                          <li
                            key={`${a.slug}-${i}`}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-foreground/20"
                          >
                            {a.kind === "music" ? (
                              <Music2 className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={href}
                                className="group inline-flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
                              >
                                <span className="truncate">{a.title}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                              </Link>
                              <p className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                                <span>{a.cefrLevel.toUpperCase()}</span>
                                <span>·</span>
                                <span>{a.category}</span>
                                <span>·</span>
                                <span className="inline-flex items-center gap-0.5 tabular-nums">
                                  <Clock className="h-3 w-3" />
                                  {a.minutes} min
                                </span>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                  {a.scope === "classroom-wide" ? (
                                    <Users className="h-3 w-3" />
                                  ) : (
                                    <UserRound className="h-3 w-3" />
                                  )}
                                  {a.scope === "classroom-wide"
                                    ? "Whole class"
                                    : "Individual"}
                                </span>
                                <span>·</span>
                                <span>{formatWhen(a.assignedAt)}</span>
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
                            <button
                              onClick={demoToast}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Private teaching notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm leading-relaxed">
                    {student.notes ?? "No notes yet."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Preferred name
                      </dt>
                      <dd>{student.preferredName ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Classroom
                      </dt>
                      <dd>{student.classroomName}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Age group
                      </dt>
                      <dd className="capitalize">{student.ageGroup}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Birthday
                      </dt>
                      <dd>
                        {student.birthday
                          ? new Date(student.birthday).toLocaleDateString("en-US", {
                              dateStyle: "medium",
                            })
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {student.assigned.filter((a) => a.status === "completed").length}{" "}
                        / {student.assigned.length} completed
                      </span>
                      <span className="font-medium tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      {student.streak}d streak
                    </span>
                    <span className="tabular-nums">{student.totalXp} XP</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Last active: {formatWhen(student.lastActivity)}
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
