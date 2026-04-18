import { getLesson } from "@/lib/content/loader";
import { getPublishedLessonDraft } from "@/lib/actions/lesson-drafts";
import { LessonPlayerWrapper } from "./lesson-player-wrapper";
import { NarrativePlayer } from "@/components/lessons/narrative-player";
import { getCharacters } from "@/lib/content/scenes";
import type { NarrativeLesson } from "@/lib/content/scenes";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scene?: string }>;
}) {
  const { slug } = await params;
  const { scene: sceneParam } = await searchParams;
  const lesson =
    (await getLesson(slug)) ?? (await getPublishedLessonDraft(slug));

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  // Narrative lessons carry a `scenes[]` array; exercise-only lessons
  // carry `exercises[]`. Pick the right player based on shape.
  const asNarrative = lesson as unknown as NarrativeLesson;
  if (Array.isArray(asNarrative.scenes) && asNarrative.scenes.length > 0) {
    const charMap = Object.fromEntries(
      getCharacters().map((c) => [c.id, c])
    );
    const parsed = Number.parseInt(sceneParam ?? "", 10);
    const initialIndex =
      Number.isFinite(parsed) && parsed >= 0 && parsed < asNarrative.scenes.length
        ? parsed
        : 0;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">{lesson.title}</h1>
          <p className="text-muted-foreground text-sm">{lesson.description}</p>
        </div>
        <NarrativePlayer
          lesson={asNarrative}
          characters={charMap}
          initialIndex={initialIndex}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <p className="text-muted-foreground text-sm">{lesson.description}</p>
      </div>
      <LessonPlayerWrapper lesson={lesson} />
    </div>
  );
}
