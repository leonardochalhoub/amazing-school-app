import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRosterStudent,
  getRosterAvatarSignedUrl,
} from "@/lib/actions/roster";
import { getAssignmentsForRosterStudent } from "@/lib/actions/assignments";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";
import { listDiaryForStudent } from "@/lib/actions/diary";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { getMusic, fromAssignmentSlug, listMusic } from "@/lib/content/music";
import { RosterAvatarUploader } from "@/components/teacher/roster-avatar-uploader";
import { RosterEditForm } from "@/components/teacher/roster-edit-form";
import { DiaryPanel } from "@/components/teacher/diary-panel";
import {
  AssignedLessonsList,
  type AssignedLessonMeta,
} from "@/components/teacher/assigned-lessons-list";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RosterStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await getRosterStudent(id);
  if (!student) notFound();

  const admin = createAdminClient();
  const { data: classrooms } = await admin
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const classroomList = (classrooms ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const [signedUrl, diary, rawAssignments, publishedLessons] = await Promise.all([
    student.has_avatar ? getRosterAvatarSignedUrl(id) : Promise.resolve(null),
    listDiaryForStudent(id),
    getAssignmentsForRosterStudent(id),
    listLessonDrafts({ status: "published" }),
  ]);

  const lessonDraftBySlug = new Map(publishedLessons.map((l) => [l.slug, l]));

  const assignments: AssignedLessonMeta[] = rawAssignments.map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lesson_slug);
    if (kind === "music") {
      const m = getMusic(slug);
      return {
        assignmentId: a.id,
        lessonSlug: a.lesson_slug,
        lessonTitle: m ? `${m.artist} — ${m.title}` : slug,
        cefrLevel: m?.cefr_level,
        category: "music" as const,
        estimatedMinutes: m
          ? Math.max(5, Math.round((m.duration_seconds / 60) * 2))
          : null,
        previewHref: m ? `/student/music/${m.slug}` : null,
        status: a.status,
        scope: a.roster_student_id === id ? "per-student" : "classroom-wide",
        assignedAt: a.assigned_at,
      };
    }
    const draft = lessonDraftBySlug.get(slug);
    const fileMeta = findLessonMeta(slug);
    const title = draft?.title ?? fileMeta?.title ?? slug;
    const cefr = draft?.cefr_level ?? fileMeta?.cefr_level;
    const category = draft?.category ?? fileMeta?.category;
    return {
      assignmentId: a.id,
      lessonSlug: a.lesson_slug,
      lessonTitle: title,
      cefrLevel: cefr,
      category,
      estimatedMinutes: fileMeta?.estimated_minutes ?? null,
      previewHref: `/student/lessons/${slug}`,
      status: a.status,
      scope: a.roster_student_id === id ? "per-student" : "classroom-wide",
      assignedAt: a.assigned_at,
    };
  });

  const assignTargetClassrooms = student.classroom_id
    ? classroomList.filter((c) => c.id === student.classroom_id)
    : [];

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Student
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {student.full_name}
        </h1>
        {student.email ? (
          <p className="text-sm text-muted-foreground">{student.email}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">
                Assigned lessons
                {assignments.length > 0 ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                    {assignments.length}
                  </span>
                ) : null}
              </CardTitle>
              <AssignLessonButton
                lessons={publishedLessons}
                musics={listMusic()}
                classrooms={assignTargetClassrooms}
                students={[
                  {
                    id,
                    fullName: student.full_name,
                    classroomId: student.classroom_id,
                  },
                ]}
                variant="subtle"
              />
            </CardHeader>
            <CardContent>
              <AssignedLessonsList assignments={assignments} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <RosterEditForm
                rosterId={id}
                fullName={student.full_name}
                preferredName={student.preferred_name}
                email={student.email}
                classroomId={student.classroom_id}
                notes={student.notes}
                ageGroup={student.age_group}
                gender={student.gender}
                hasAvatar={student.has_avatar}
                classrooms={classroomList}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <DiaryPanel rosterStudentId={id} entries={diary} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <RosterAvatarUploader
                rosterId={id}
                currentSignedUrl={signedUrl}
                fullName={student.full_name}
                ageGroup={student.age_group}
                gender={student.gender}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
