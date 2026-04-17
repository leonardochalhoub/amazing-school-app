import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, Music2 } from "lucide-react";
import { loadMusicSong } from "@/lib/content/music-server";
import { MusicBoard } from "@/components/student/music-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyExerciseResponses } from "@/lib/actions/exercise-responses";
import { toMusicSlug, cambridgeUrl } from "@/lib/content/music";
import { getOverrideForStudent } from "@/lib/actions/music-overrides";
import type { MusicExercise, SingAlongPrompt } from "@/lib/content/music";
import { MarkCompleteButton } from "@/components/student/mark-complete-button";
import { createClient } from "@/lib/supabase/server";

interface Params {
  slug: string;
}

export default async function StudentMusicPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const baseSong = await loadMusicSong(slug);
  if (!baseSong) notFound();

  const override = await getOverrideForStudent(slug);
  const song = override
    ? {
        ...baseSong,
        sing_along:
          (override.sing_along as { prompts: SingAlongPrompt[] } | null) ??
          baseSong.sing_along,
        exercises:
          (override.exercises as MusicExercise[] | null) ?? baseSong.exercises,
      }
    : baseSong;

  const lessonSlug = toMusicSlug(slug);
  const initialResponses = await listMyExerciseResponses(lessonSlug);

  // Is this lesson already marked complete for the viewer?
  let alreadyCompleted = false;
  const supabaseClient = await createClient();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (user) {
    const { data: progress } = await supabaseClient
      .from("lesson_progress")
      .select("completed_at")
      .eq("student_id", user.id)
      .eq("lesson_slug", lessonSlug)
      .not("completed_at", "is", null)
      .limit(1)
      .maybeSingle();
    alreadyCompleted = !!progress;
  }

  const minutes = Math.floor(song.duration_seconds / 60);
  const seconds = song.duration_seconds % 60;
  const durationLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/student/music"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to musics
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
          lessonSlug={lessonSlug}
          initialResponses={initialResponses}
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
                        title={`Cambridge Dictionary: ${v.term}`}
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
              <p className="mt-3 text-[10px] text-muted-foreground">
                Tap a word to look it up on Cambridge Dictionary.
              </p>
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

      <MarkCompleteButton
        lessonSlug={lessonSlug}
        xpReward={25}
        initiallyCompleted={alreadyCompleted}
      />
    </div>
  );
}
