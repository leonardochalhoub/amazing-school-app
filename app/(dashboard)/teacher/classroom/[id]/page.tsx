import Link from "next/link";
import { getClassroomDetails } from "@/lib/actions/classroom";
import { getClassroomStudentRows } from "@/lib/actions/teacher-dashboard";
import { getAssignmentsForClassroom } from "@/lib/actions/assignments";
import { getUpcomingClasses, getPastClasses } from "@/lib/actions/schedule";
import { getAllLessons } from "@/lib/content/loader";
import { listMusic, fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { RealtimeGrid } from "@/components/teacher/realtime-grid";
import { DeleteClassroomButton } from "@/components/teacher/delete-classroom-button";
import { AddStudentsToClassroomButton } from "@/components/teacher/add-students-to-classroom-button";
import { RemoveStudentsFromClassroomButton } from "@/components/teacher/remove-students-from-classroom-button";
import {
  PastClassLog,
  type PastClass,
} from "@/components/teacher/past-class-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function ClassroomDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClassroomDetails(id);

  if (!data) {
    return (
      <p className="text-center text-muted-foreground">Classroom not found.</p>
    );
  }

  const { classroom } = data;
  const [rows, assignments, upcoming, pastRaw, publishedLessons] = await Promise.all([
    getClassroomStudentRows(id),
    getAssignmentsForClassroom(id),
    getUpcomingClasses(id),
    getPastClasses(id),
    getAssignableLessons(),
  ]);

  const past: PastClass[] = (pastRaw as PastClass[]).map((c) => ({
    id: c.id,
    title: c.title,
    meeting_url: c.meeting_url,
    scheduled_at: c.scheduled_at,
    observations: c.observations ?? null,
    completion_status: c.completion_status ?? null,
  }));

  const allLessons = getAllLessons();
  const allMusic = listMusic();
  const classroomWideAssigned = assignments
    .filter((a) => a.student_id === null)
    .map((a) => a.lesson_slug);

  function prettyAssignmentTitle(slug: string): string {
    const parsed = fromAssignmentSlug(slug);
    if (parsed.kind === "music") {
      const m = getMusic(parsed.slug);
      return m ? `${m.title} — ${m.artist}` : slug;
    }
    return allLessons.find((l) => l.slug === slug)?.title ?? slug;
  }

  const rosterStudents = rows
    .filter(
      (r): r is typeof r & { rosterStudentId: string } =>
        !!(r as { rosterStudentId?: string }).rosterStudentId,
    )
    .map((r) => ({
      id: r.rosterStudentId,
      fullName: r.fullName,
      classroomId: id,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {classroom.name}
          </h1>
          {classroom.description ? (
            <p className="text-xs text-muted-foreground">
              {classroom.description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {classroom.invite_code}
            </Badge>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {rows.length} students · {assignments.length} assignments
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <AddStudentsToClassroomButton
            classroomId={id}
            classroomName={classroom.name}
          />
          <RemoveStudentsFromClassroomButton
            classroomId={id}
            classroomName={classroom.name}
            students={rows
              .filter(
                (r): r is typeof r & { rosterStudentId: string } =>
                  !!(r as { rosterStudentId?: string }).rosterStudentId,
              )
              .map((r) => ({
                rosterStudentId: r.rosterStudentId,
                fullName: r.fullName,
              }))}
          />
          <AssignLessonButton
            lessons={publishedLessons}
            musics={allMusic}
            classrooms={[{ id, name: classroom.name }]}
            students={rosterStudents}
            label="Bulk assign"
          />
          <Link href={`/teacher/classroom/${id}/schedule`}>
            <Button size="sm" variant="outline">Schedule</Button>
          </Link>
          <DeleteClassroomButton
            classroomId={id}
            classroomName={classroom.name}
            studentCount={rows.length}
          />
        </div>
      </div>

      <Separator />

      <section>
        <h2 className="text-sm font-semibold mb-2">Students</h2>
        <RealtimeGrid classroomId={id} initial={rows} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Classroom-wide assignments ({classroomWideAssigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classroomWideAssigned.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No classroom-wide lessons yet.
              </p>
            ) : (
              <ul className="text-sm divide-y divide-border">
                {classroomWideAssigned.map((slug) => (
                  <li
                    key={slug}
                    className="py-1.5 flex items-center justify-between"
                  >
                    <span className="truncate">{prettyAssignmentTitle(slug)}</span>
                    <Badge variant="outline" className="text-[10px]">
                      All students
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Upcoming classes</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No upcoming classes scheduled.
              </p>
            ) : (
              <ul className="text-sm divide-y divide-border">
                {upcoming.map((cls) => (
                  <li key={cls.id} className="py-1.5">
                    <p className="font-medium">{cls.title}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(cls.scheduled_at).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="py-5">
          <PastClassLog classes={past} />
        </CardContent>
      </Card>
    </div>
  );
}
