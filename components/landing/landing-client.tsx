"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, ExternalLink } from "lucide-react";

// Brand icons are not shipped by the installed lucide-react version,
// so we inline them as tiny SVG components keyed to currentColor.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2.02c-3.2.69-3.87-1.38-3.87-1.38-.52-1.32-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.74-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.03 11.03 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A10.53 10.53 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.86-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.86 3.38-1.86 3.61 0 4.28 2.37 4.28 5.46v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.23 0H1.77C.79 0 0 .78 0 1.74v20.52C0 23.22.79 24 1.77 24h20.46c.98 0 1.77-.78 1.77-1.74V1.74C24 .78 23.21 0 22.23 0Z" />
    </svg>
  );
}
import Link from "next/link";
import { getPublicStats, type PublicStats } from "@/lib/actions/public-stats";
import { DemoAccess } from "@/components/landing/demo-access";

const features = [
  { key: "lessons" as const, icon: "📖" },
  { key: "ai" as const, icon: "🤖" },
  { key: "gamification" as const, icon: "🏆" },
  { key: "classroom" as const, icon: "📹" },
  { key: "progress" as const, icon: "📊" },
  { key: "openSource" as const, icon: "💙" },
];

export function LandingClient() {
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
            className="flex shrink-0 items-center gap-2 whitespace-nowrap md:gap-3"
          >
            <BrandMark className="h-9 w-9 shrink-0 md:h-11 md:w-11" />
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-2xl italic leading-none text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400 md:text-3xl"
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

      {/* Demo access pinned up high in the empty space between the header
          and the hero, so the big title starts earlier down the page. */}
      <div className="px-4 pt-4 md:pt-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {locale === "pt-BR"
              ? "Explore direto ↓"
              : "Explore right now ↓"}
          </p>
          <DemoAccess
            teacherLabel={
              locale === "pt-BR"
                ? "Ver como professora"
                : "View as a teacher"
            }
            studentLabel={
              locale === "pt-BR"
                ? "Ver como estudante"
                : "View as a student"
            }
            teacherHint={locale === "pt-BR" ? "Demo" : "Live demo"}
            studentHint={locale === "pt-BR" ? "Demo" : "Live demo"}
          />

          {/* Documentation links — slim pill buttons underneath the
              demo cards. Teacher guide is always the English version,
              student guide is always the pt-BR version. */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <a
              href="/r/teacher-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>
                {locale === "pt-BR"
                  ? "Doc do professor · EN"
                  : "Teacher docs · EN"}
              </span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <a
              href="/r/student-docs-pt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                {locale === "pt-BR"
                  ? "Doc do aluno · PT-BR"
                  : "Student docs · PT-BR"}
              </span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:py-12">
        <div className="max-w-3xl text-center space-y-6 sm:space-y-8">
          <Badge
            variant="secondary"
            className="px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm font-medium border border-border"
          >
            {t.landing.badge}
          </Badge>

          {/* Mobile title is ~20% smaller than it used to be so the
              hero no longer pushes the stats and demo cards off the
              fold on phones. Scales back up on sm+. */}
          <h1 className="text-[2rem] leading-tight sm:text-6xl lg:text-7xl font-bold tracking-tight sm:leading-[1.1]">
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

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrandMark className="h-5 w-5" />
            <span>Amazing School</span>
            <span>&middot;</span>
            <span>{t.landing.openSourceTag}</span>
          </div>

          {/* Project + author links — center on mobile, inline on sm+. */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <a
              href="https://github.com/leonardochalhoub/amazing-school-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label="Amazing School on GitHub"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <span>
                {locale === "pt-BR" ? "Projeto no GitHub" : "Project on GitHub"}
              </span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <a
              href="https://www.linkedin.com/in/leonardochalhoub/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label="Leonardo Chalhoub on LinkedIn"
            >
              <LinkedinIcon className="h-3.5 w-3.5" />
              <span>Leonardo Chalhoub · LinkedIn</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
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
          {value.toLocaleString("pt-BR")}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
