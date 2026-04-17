import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock } from "lucide-react";
import { getLesson } from "@/lib/content/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

interface Params {
  slug: string;
}

export default async function DemoLessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  return (
    <>
      <DemoBanner backHref="/demo/lessons" backLabel="Back to lessons catalog" />

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

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
        <div className="space-y-6 pb-16">
          <Link
            href="/demo/lessons"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to lessons
          </Link>

          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{lesson.cefr_level.toUpperCase()}</span>
              <span>·</span>
              <span className="capitalize">{lesson.category}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {lesson.estimated_minutes} min
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {lesson.title}
            </h1>
            <p className="text-base text-muted-foreground">{lesson.description}</p>
          </header>

          {lesson.summary_pt_br ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                  Resumo (pt-BR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{lesson.summary_pt_br}</p>
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">
              Exercises preview
            </h2>
            <ol className="space-y-2">
              {lesson.exercises.map((ex, i) => (
                <li
                  key={ex.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Exercise {i + 1}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {ex.type.replace("_", " ")}
                    </Badge>
                  </div>
                  {ex.question ? (
                    <p className="mt-2 text-sm font-medium">{ex.question}</p>
                  ) : null}
                  {ex.options ? (
                    <ul className="mt-2 space-y-1">
                      {ex.options.map((o, oi) => (
                        <li
                          key={oi}
                          className={`rounded-md border px-3 py-1.5 text-sm ${
                            typeof ex.correct === "number" && oi === ex.correct
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-border"
                          }`}
                        >
                          {o}
                          {typeof ex.correct === "number" && oi === ex.correct ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                              answer
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {ex.pairs ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {ex.pairs.map((p, pi) => (
                        <li key={pi} className="flex items-center gap-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {p[0]}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <span>{p[1]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {ex.explanation ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      {ex.explanation}
                    </p>
                  ) : null}
                  {ex.hint_pt_br ? (
                    <p className="mt-1 text-[11px] italic text-muted-foreground">
                      🇧🇷 {ex.hint_pt_br}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sign up to interact with the exercises and track your progress.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              ✨ Sign up free
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
