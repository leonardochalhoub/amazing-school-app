import { Music2 } from "lucide-react";
import { listMusic } from "@/lib/content/music";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { getTeacherOverview } from "@/lib/actions/teacher-dashboard";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";
import { MusicCatalog } from "@/components/shared/music-catalog";

export default async function TeacherMusicIndex() {
  const [{ classrooms, roster }, publishedLessons] = await Promise.all([
    getTeacherOverview(),
    listLessonDrafts({ status: "published" }),
  ]);
  const musics = listMusic();

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
            {musics.length} songs · assign to a classroom or a single student.
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

      <MusicCatalog songs={musics} variant="teacher" />
    </div>
  );
}
