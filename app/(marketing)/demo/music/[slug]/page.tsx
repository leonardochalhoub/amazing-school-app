import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Music2 } from "lucide-react";
import { loadMusicSong } from "@/lib/content/music-server";
import { MusicBoard } from "@/components/student/music-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cambridgeUrl } from "@/lib/content/music";
import { BrandMark } from "@/components/layout/brand-mark";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExternalLink } from "lucide-react";

interface Params {
  slug: string;
}

export default async function DemoMusicPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const song = await loadMusicSong(slug);
  if (!song) notFound();

  const minutes = Math.floor(song.duration_seconds / 60);
  const seconds = song.duration_seconds % 60;
  const durationLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

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
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Music2 className="h-3.5 w-3.5" />
              <span>{song.cefr_level.toUpperCase()}</span>
              <span>·</span>
              <span>{song.genre.join(" · ")}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {durationLabel}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{song.title}</h1>
            <p className="text-lg text-muted-foreground">
              {song.artist} · {song.year}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <MusicBoard
              song={song}
              lessonSlug={`music:${slug}`}
              initialResponses={[]}
              demoMode
            />

            <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vocabulary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {song.vocab_hooks.map((v) => (
                      <li key={v.term} className="flex flex-col">
                        <span className="inline-flex items-center gap-1">
                          <a
                            href={cambridgeUrl(v.term)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline decoration-dotted underline-offset-2 hover:text-primary"
                          >
                            {v.term}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-muted-foreground"> · {v.pt}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {v.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {song.grammar_callouts.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Grammar spotlight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {song.grammar_callouts.map((g) => (
                        <li key={g} className="text-muted-foreground">
                          · {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {song.copyright_notice}
              </p>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
