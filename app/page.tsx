"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getPublicStats, type PublicStats } from "@/lib/actions/public-stats";

const features = [
  { key: "lessons" as const, icon: "📖" },
  { key: "ai" as const, icon: "🤖" },
  { key: "gamification" as const, icon: "🏆" },
  { key: "classroom" as const, icon: "📹" },
  { key: "progress" as const, icon: "📊" },
  { key: "openSource" as const, icon: "💙" },
];

export default function Home() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    getPublicStats()
      .then((s) => setStats(s))
      .catch(() => setStats(null));
  }, []);

  const statTeachersLabel = locale === "pt-BR" ? "Professores" : "Teachers";
  const statSongsLabel = locale === "pt-BR" ? "Músicas" : "Songs";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-border/50 bg-background/80 backdrop-blur-md">
        {/* Phone: two stacked rows — logo first, controls below. md+: one row. */}
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center gap-2 px-3 py-3 md:h-20 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-0">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 md:gap-3"
          >
            <BrandMark className="h-9 w-9 md:h-11 md:w-11" />
            <span
              className="truncate bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-2xl italic leading-none text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400 md:text-3xl"
              style={{ letterSpacing: "-0.01em" }}
            >
              Amazing School
            </span>
          </Link>
          <div className="flex w-full flex-wrap items-center justify-center gap-1.5 md:w-auto md:flex-nowrap md:gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t.landing.signIn}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="whitespace-nowrap">
                {t.landing.getStarted}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32">
        <div className="max-w-3xl text-center space-y-8">
          <Badge
            variant="secondary"
            className="px-4 py-1.5 text-sm font-medium border border-border"
          >
            {t.landing.badge}
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            {t.landing.title.split(" ").map((word, i) => {
              if (word === "AI" || word === "IA") {
                return (
                  <span
                    key={i}
                    className="bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 bg-clip-text text-transparent"
                  >
                    {word}{" "}
                  </span>
                );
              }
              return <span key={i}>{word} </span>;
            })}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.landing.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base px-8 h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0"
              >
                {t.landing.getStarted}
              </Button>
            </Link>
            <Link href="/demo/teacher">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base px-8 h-12"
              >
                {t.landing.seeTeacherDemo}
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto text-base px-8 h-12"
              >
                {t.landing.signIn}
              </Button>
            </Link>
          </div>

          {/* Stats — live counts pulled from the database */}
          <div className="grid grid-cols-2 gap-6 pt-8 sm:flex sm:justify-center sm:gap-10">
            <StatNumber
              value={stats?.students}
              label={t.landing.stats.students}
            />
            <StatNumber value={stats?.teachers} label={statTeachersLabel} />
            <StatNumber value={stats?.lessons} label={t.landing.stats.lessons} />
            <StatNumber value={stats?.songs} label={statSongsLabel} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ key, icon }) => (
              <div
                key={key}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-lg mb-1">
                  {t.landing.features[key].title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.landing.features[key].desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 p-12 text-white shadow-xl shadow-violet-500/20">
            <h2 className="text-3xl font-bold mb-3">{t.landing.cta.title}</h2>
            <p className="text-white/80 mb-6">{t.landing.cta.desc}</p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-violet-700 hover:bg-white/90 border-0 text-base px-8 h-12 font-semibold"
              >
                {t.landing.cta.button}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrandMark className="h-5 w-5" />
            <span>Amazing School</span>
            <span>&middot;</span>
            <span>{t.landing.openSourceTag}</span>
          </div>
          <div className="flex items-center gap-4">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatNumber({
  value,
  label,
}: {
  value: number | undefined;
  label: string;
}) {
  return (
    <div className="text-center">
      {value == null ? (
        <div className="mx-auto h-8 w-14 animate-pulse rounded bg-muted" />
      ) : (
        <p className="text-2xl font-bold tabular-nums">
          {value.toLocaleString()}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
