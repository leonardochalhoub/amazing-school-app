import Link from "next/link";
import { Clock, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listMusic } from "@/lib/content/music";

const CEFR_ORDER = ["a1.1", "a1.2", "a2.1", "a2.2", "b1.1", "b1.2", "b2.1", "b2.2", "c1.1", "c1.2"];

export default function StudentMusicIndex() {
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
    <div className="space-y-8 pb-16">
      <header className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Music2 className="h-3.5 w-3.5" />
          <span>Music catalog</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Music</h1>
        <p className="text-sm text-muted-foreground">
          {songs.length} songs · learn English through real tracks with
          exercises and synced captions.
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
                  href={`/student/music/${s.slug}`}
                  className="group block"
                >
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start gap-2">
                        <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium leading-tight">
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
  );
}
