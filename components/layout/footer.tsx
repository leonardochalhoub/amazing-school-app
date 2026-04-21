"use client";

import { useEffect, useState } from "react";
import { Heart, Calendar } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { useI18n } from "@/lib/i18n/context";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M12 .5C5.7.5.5 5.7.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.3-1.69-1.3-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.01 11.01 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.04.78 2.1v3.12c0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.44-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29ZM5.34 7.44a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
    </svg>
  );
}

const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ??
  "https://github.com/leonardochalhoub/amazing-school-app";
const LINKEDIN_URL =
  process.env.NEXT_PUBLIC_LINKEDIN_URL ??
  "https://www.linkedin.com/in/leonardochalhoub/";
/**
 * Only use the build-time env var. Falling back to `new Date()` here
 * trips React #418 because the module evaluates at different moments
 * on the server vs in the browser bundle — two different ISO strings
 * for the same "build date" is the textbook hydration mismatch.
 */
const BUILD_DATE: string | null =
  process.env.NEXT_PUBLIC_BUILD_DATE ?? null;

function formatBuildDate(iso: string, locale: "en" | "pt-BR"): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(
      locale === "pt-BR" ? "pt-BR" : "en-US",
      {
        timeZone: "America/Sao_Paulo",
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    ).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

export function Footer() {
  const { locale } = useI18n();
  // Year is also time-dependent, compute on the client after mount
  // so the server/client always agree on the initial HTML. A null
  // year renders as an empty span on first paint.
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  const builtOn = BUILD_DATE
    ? formatBuildDate(BUILD_DATE, locale === "pt-BR" ? "pt-BR" : "en")
    : null;

  const t = locale === "pt-BR"
    ? {
        tagline: "Lições geradas por IA, revisadas por professores reais.",
        builtBy: "Feito com",
        by: "por",
        project: "Projeto",
        connect: "Conecte-se",
        tech: "Tecnologia",
        lastUpdate: "Última atualização",
        source: "Código fonte",
        linkedin: "LinkedIn",
        license: "MIT — 100% livre, para sempre.",
      }
    : {
        tagline: "AI-generated lessons, curated by real teachers.",
        builtBy: "Built with",
        by: "by",
        project: "Project",
        connect: "Connect",
        tech: "Stack",
        lastUpdate: "Last updated",
        source: "Source code",
        linkedin: "LinkedIn",
        license: "MIT — 100% free, forever.",
      };

  return (
    <footer className="relative mt-auto border-t border-border/70 bg-gradient-to-b from-background to-muted/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4 md:px-6">
        <div className="sm:col-span-2 md:col-span-2">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-2xl italic leading-none text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.01em" }}
            >
              Amazing School
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t.tagline}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {t.license}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            v1.0.0 · {locale === "pt-BR" ? "lançamento estável" : "stable release"}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.connect}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <GithubIcon className="h-4 w-4" />
                {t.source}
              </a>
            </li>
            <li>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <LinkedinIcon className="h-4 w-4" />
                {t.linkedin}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.tech}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>Next.js 16 + React 19</li>
            <li>Supabase + Postgres</li>
            <li>Claude by Anthropic</li>
            <li>Tailwind + shadcn/ui</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 text-xs text-muted-foreground md:px-6">
          <p className="inline-flex items-center gap-1.5">
            {t.builtBy} <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />{" "}
            {t.by}{" "}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Leonardo Chalhoub
            </a>
            {year !== null ? (
              <>
                {" · "}
                <span>© {year}</span>
              </>
            ) : null}
          </p>
          {builtOn ? (
            <p className="inline-flex items-center gap-1.5 tabular-nums">
              <Calendar className="h-3 w-3" />
              {t.lastUpdate}: <span className="font-mono">{builtOn}</span>
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
