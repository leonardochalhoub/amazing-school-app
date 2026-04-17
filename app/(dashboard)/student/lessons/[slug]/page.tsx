import { getLesson } from "@/lib/content/loader";
import { getPublishedLessonDraft } from "@/lib/actions/lesson-drafts";
import { LessonPlayerWrapper } from "./lesson-player-wrapper";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson =
    (await getLesson(slug)) ?? (await getPublishedLessonDraft(slug));

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lesson not found.</p>
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
