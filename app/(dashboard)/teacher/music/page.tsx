import Link from "next/link";
import { Clock, Music2, ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listMusic } from "@/lib/content/music";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { getTeacherOverview } from "@/lib/actions/teacher-dashboard";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";

const CEFR_ORDER = ["a1.1", "a1.2", "a2.1", "a2.2", "b1.1", "b1.2", "b2.1", "b2.2", "c1.1", "c1.2"];

export default async function TeacherMusicIndex() {
  const [{ classrooms, roster }, publishedLessons] = await Promise.all([
    getTeacherOverview(),
    listLessonDrafts({ status: "published" }),
  ]);
  const musics = listMusic();

  const songs = [...musics].sort((a, b) => {
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

  const classroomOptions = classrooms.map((c) => ({ id: c.id, name: c.name }));
  const studentOptions = roster.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    classroomId: r.classroomId,
  }));

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Music2 className="h-3.5 w-3.5" />
            <span>Musics catalog</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Musics</h1>
          <p className="text-sm text-muted-foreground">
            {songs.length} songs · assign to a classroom or a single student.
            Every assignment shows up alongside regular lessons.
          </p>
        </div>
        <AssignLessonButton
          lessons={publishedLessons}
          musics={musics}
          classrooms={classroomOptions}
          students={studentOptions}
          variant="primary"
        />
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
                <Card
                  key={s.slug}
                  className="transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <CardContent className="space-y-3 p-4">
                    <Link
                      href={`/student/music/${s.slug}`}
                      className="group block"
                    >
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
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
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
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/teacher/music/${s.slug}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3 w-3" />
                        Personalize
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
