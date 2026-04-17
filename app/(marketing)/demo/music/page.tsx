"use client";

import Link from "next/link";
import { Clock, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { listMusic } from "@/lib/content/music";
import { useI18n } from "@/lib/i18n/context";

const CEFR_ORDER = ["a1.1", "a1.2", "a2.1", "a2.2", "b1.1", "b1.2", "b2.1", "b2.2", "c1.1", "c1.2"];

export default function DemoMusicCatalogPage() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const songs = [...listMusic()].sort((a, b) => {
    const ai = CEFR_ORDER.indexOf(a.cefr_level);
    const bi = CEFR_ORDER.indexOf(b.cefr_level);
    if (ai !== bi) return ai - bi;
    return a.artist.localeCompare(b.artist);
  });

  const byLevel = new Map<string, typeof songs>();
  for (const s of songs) {
    const list = byLevel.get(s.cefr_level) ?? [];
    list.push(s);
    byLevel.set(s.cefr_level, list);
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
              <Link href="/demo/lessons" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
                {isPt ? "Lições" : "Lessons"}
              </Link>
              <span className="rounded-full bg-foreground px-3 py-1.5 text-background">
                {isPt ? "Músicas" : "Musics"}
              </span>
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
              <Music2 className="h-3.5 w-3.5" />
              <span>{isPt ? "Catálogo de músicas" : "Musics catalog"}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isPt ? "Músicas" : "Musics"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {songs.length}{" "}
              {isPt
                ? "músicas · clique em qualquer uma para experimentar a página completa do aluno."
                : "songs · click any one to try the full student experience."}
            </p>
          </header>

          {Array.from(byLevel.entries()).map(([level, levelSongs]) => (
            <section key={level} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {level.toUpperCase()}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {levelSongs.map((s) => {
                  const minutes = Math.floor(s.duration_seconds / 60);
                  const seconds = s.duration_seconds % 60;
                  return (
                    <Link
                      key={s.slug}
                      href={`/demo/music/${s.slug}`}
                      className="group block"
                    >
                      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start gap-2">
                            <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium leading-tight group-hover:text-primary">
                                {s.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {s.artist} · {s.year}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">
                              {s.cefr_level.toUpperCase()}
                            </Badge>
                            <span>{s.genre.slice(0, 2).join(" · ")}</span>
                            <span className="ml-auto inline-flex items-center gap-0.5 tabular-nums">
                              <Clock className="h-3 w-3" />
                              {minutes}:{String(seconds).padStart(2, "0")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
