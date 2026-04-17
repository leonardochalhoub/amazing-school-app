"use client";

import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAllLessons } from "@/lib/content/loader";
import { useI18n } from "@/lib/i18n/context";

export default function DemoLessonsCatalogPage() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const lessons = getAllLessons();

  const byLevel = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const list = byLevel.get(l.cefr_level) ?? [];
    list.push(l);
    byLevel.set(l.cefr_level, list);
  }

  return (
    <>
      <DemoBanner backHref="/demo/teacher" backLabel={isPt ? "Voltar ao painel demo" : "Back to demo dashboard"} />

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
          <nav className="hidden md:flex">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 text-xs font-medium">
              <span className="rounded-full bg-foreground px-3 py-1.5 text-background">
                {isPt ? "Lições" : "Lessons"}
              </span>
              <Link href="/demo/music" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
                {isPt ? "Músicas" : "Musics"}
              </Link>
            </div>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="space-y-8 pb-16">
          <header className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{isPt ? "Catálogo de lições" : "Lessons catalog"}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isPt ? "Lições" : "Lessons"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lessons.length}{" "}
              {isPt
                ? "lições organizadas por CEFR."
                : "lessons organized by CEFR level."}
            </p>
          </header>

          {Array.from(byLevel.entries()).map(([level, levelLessons]) => (
            <section key={level} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {level.toUpperCase()}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {levelLessons.map((l) => (
                  <Link
                    key={l.slug}
                    href={`/demo/lessons/${l.slug}`}
                    className="group block"
                  >
                    <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start gap-2">
                          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium leading-tight group-hover:text-primary">
                              {l.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
                              {l.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {l.cefr_level.toUpperCase()}
                          </Badge>
                          <span className="inline-flex items-center gap-0.5 tabular-nums">
                            <Clock className="h-3 w-3" />
                            {l.estimated_minutes} min
                          </span>
                          <span className="ml-auto tabular-nums">
                            {l.exercise_count}{" "}
                            {isPt ? "exercícios" : "exercises"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
