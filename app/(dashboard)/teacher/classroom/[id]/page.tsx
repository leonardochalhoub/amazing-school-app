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
import { ExpandableList } from "@/components/teacher/expandable-list";
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

  function prettyAssignmentTitle(slug: string): string {
    const parsed = fromAssignmentSlug(slug);
    if (parsed.kind === "music") {
      const m = getMusic(parsed.slug);
      return m ? `${m.title} — ${m.artist}` : slug;
    }
    return allLessons.find((l) => l.slug === slug)?.title ?? slug;
  }

  // Classroom-wide rows already come sorted desc by assigned_at from
  // the action. Keep the pretty title + date for the list rendering.
  const classroomWideAssigned = assignments
    .filter((a) => a.student_id === null)
    .map((a) => ({
      id: a.id,
      title: prettyAssignmentTitle(a.lesson_slug),
      assignedAt: a.assigned_at,
    }));

  const assignedAtFmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">
            {classroom.name}
          </h1>
          {classroom.description ? (
            <p className="text-xs text-muted-foreground">
              {classroom.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {classroom.invite_code}
            </Badge>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {rows.length} students · {assignments.length} assignments
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
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
              <ExpandableList
                initial={10}
                items={classroomWideAssigned.map((a) => ({
                  key: a.id,
                  node: (
                    <div className="py-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {assignedAtFmt.format(new Date(a.assignedAt))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        All students
                      </Badge>
                    </div>
                  ),
                }))}
              />
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
                      {new Date(cls.scheduled_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
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
          <PastClassLog classes={past} initialLimit={5} />
        </CardContent>
      </Card>
    </div>
  );
}
