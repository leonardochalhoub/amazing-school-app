import Link from "next/link";
import { Music2, BookOpen, Clock } from "lucide-react";
import {
  getAllLessons,
  getLessonsByCefr,
  findMeta as findLessonMeta,
} from "@/lib/content/loader";
import { CEFR_LEVELS } from "@/lib/content/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getAssignmentsForStudent } from "@/lib/actions/assignments";
import { getStudentClassrooms } from "@/lib/actions/classroom";
import { fromAssignmentSlug, getMusic } from "@/lib/content/music";

interface LessonsPageProps {
  searchParams: Promise<{ cefr?: string }>;
}

interface AssignedCard {
  kind: "lesson" | "music";
  slug: string;
  href: string;
  title: string;
  subtitle: string | null;
  cefrLabel: string | null;
  minutes: number | null;
  status: "assigned" | "skipped" | "completed";
}

export default async function LessonsPage({ searchParams }: LessonsPageProps) {
  const { cefr } = await searchParams;
  const activeCefr =
    cefr && (CEFR_LEVELS as readonly string[]).includes(cefr)
      ? (cefr as (typeof CEFR_LEVELS)[number])
      : null;

  const lessons = activeCefr ? getLessonsByCefr(activeCefr) : getAllLessons();
  const categories = Array.from(new Set(lessons.map((l) => l.category)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let assignedCards: AssignedCard[] = [];
  if (user) {
    const classrooms = await getStudentClassrooms();
    const first = classrooms?.[0] as
      | { id: string; name: string }
      | undefined;
    if (first?.id) {
      const raw = await getAssignmentsForStudent(first.id, user.id);
      assignedCards = raw
        .filter((a) => a.status !== "skipped")
        .map((a) => {
          const { kind, slug } = fromAssignmentSlug(a.lesson_slug);
          if (kind === "music") {
            const m = getMusic(slug);
            return {
              kind: "music" as const,
              slug,
              href: `/student/music/${slug}`,
              title: m ? `${m.artist} — ${m.title}` : slug,
              subtitle: m ? m.genre.join(" · ") : null,
              cefrLabel: m?.cefr_level.toUpperCase() ?? null,
              minutes: m
                ? Math.max(5, Math.round((m.duration_seconds / 60) * 2))
                : null,
              status: a.status,
            };
          }
          const meta = findLessonMeta(slug);
          return {
            kind: "lesson" as const,
            slug,
            href: `/student/lessons/${slug}`,
            title: meta?.title ?? slug,
            subtitle: meta?.category ?? null,
            cefrLabel: meta?.cefr_level.toUpperCase() ?? null,
            minutes: meta?.estimated_minutes ?? null,
            status: a.status,
          };
        });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Lessons</h1>
        <p className="text-sm text-muted-foreground">
          {lessons.length} lessons · filter by CEFR level
        </p>
      </div>

      {assignedCards.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Assigned to you</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {assignedCards.length}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {assignedCards.map((a) => (
              <Link
                key={`${a.kind}:${a.slug}`}
                href={a.href}
                className="group block"
              >
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {a.kind === "music" ? (
                          <Music2 className="h-4 w-4 text-primary" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="truncate font-medium">{a.title}</p>
                      </div>
                      {a.status === "completed" ? (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          Done
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {a.cefrLabel ? (
                        <Badge variant="outline" className="text-[10px]">
                          {a.cefrLabel}
                        </Badge>
                      ) : null}
                      {a.subtitle ? <span>{a.subtitle}</span> : null}
                      {a.minutes ? (
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          <Clock className="h-3 w-3" />
                          {a.minutes} min
                        </span>
                      ) : null}
                    </div>
                    <Button size="sm" className="w-full">
                      {a.status === "completed" ? "Review" : "Open"}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/student/lessons"
          className={`rounded px-3 py-1 text-xs border ${
            activeCefr === null
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </Link>
        {CEFR_LEVELS.map((l) => (
          <Link
            key={l}
            href={`/student/lessons?cefr=${l}`}
            className={`rounded px-3 py-1 text-xs border ${
              activeCefr === l
                ? "bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.toUpperCase()}
          </Link>
        ))}
      </nav>

      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h2 className="text-lg font-semibold capitalize">{category}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {lessons
              .filter((l) => l.category === category)
              .map((lesson) => (
                <Card key={lesson.slug}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {lesson.cefr_level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ~{lesson.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {lesson.exercise_count} exercises · {lesson.xp_reward} XP
                      </span>
                      <Link href={`/student/lessons/${lesson.slug}`}>
                        <Button size="sm">Start</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
