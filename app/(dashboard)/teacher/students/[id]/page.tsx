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
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { listDiaryForStudent } from "@/lib/actions/diary";
import { findMeta as findLessonMeta } from "@/lib/content/loader";
import { getMusic, fromAssignmentSlug, listMusic } from "@/lib/content/music";
import { RosterAvatarUploader } from "@/components/teacher/roster-avatar-uploader";
import { RosterEditForm } from "@/components/teacher/roster-edit-form";
import { DiaryPanel } from "@/components/teacher/diary-panel";
import { StudentHistoryPanel } from "@/components/teacher/student-history-panel";
import { listStudentHistory } from "@/lib/actions/student-history";
import {
  AssignedLessonsList,
  type AssignedLessonMeta,
} from "@/components/teacher/assigned-lessons-list";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { StudentInviteButton } from "@/components/teacher/student-invite-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentReportsCard } from "@/components/reports/student-reports-card";
import { listPaidInvoicesForStudent } from "@/lib/actions/reports";

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
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const classroomList = (classrooms ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const selfUploadUrl = student.auth_user_id
    ? await (async () => {
        const { data } = await admin.storage
          .from("avatars")
          .createSignedUrl(`${student.auth_user_id}.webp`, 3600);
        return data?.signedUrl ?? null;
      })()
    : null;

  const [
    rosterSigned,
    diary,
    rawAssignments,
    publishedLessons,
    history,
    paidInvoices,
  ] = await Promise.all([
    student.has_avatar ? getRosterAvatarSignedUrl(id) : Promise.resolve(null),
    listDiaryForStudent(id),
    getAssignmentsForRosterStudent(id),
    getAssignableLessons(),
    listStudentHistory({ rosterStudentId: id }),
    listPaidInvoicesForStudent(id),
  ]);

  const signedUrl = rosterSigned ?? selfUploadUrl;
  const hasAvatar = student.has_avatar || !!selfUploadUrl;

  const lessonDraftBySlug = new Map(publishedLessons.map((l) => [l.slug, l]));

  // Build a classroom lookup that also includes soft-deleted rooms,
  // so assignments from a now-archived classroom still render with
  // the original name tag on the student's profile.
  const assignmentClassroomIds = Array.from(
    new Set(
      (rawAssignments ?? [])
        .map((a) => a.classroom_id)
        .filter((x): x is string => !!x),
    ),
  );
  const classroomNameById = new Map<string, string>();
  for (const c of classroomList) classroomNameById.set(c.id, c.name);
  const missing = assignmentClassroomIds.filter(
    (cid) => !classroomNameById.has(cid),
  );
  if (missing.length > 0) {
    const { data: extra } = await admin
      .from("classrooms")
      .select("id, name")
      .in("id", missing);
    for (const c of (extra ?? []) as Array<{ id: string; name: string }>) {
      classroomNameById.set(c.id, c.name);
    }
  }

  const assignments: AssignedLessonMeta[] = rawAssignments.map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lesson_slug);
    const classroomName = a.classroom_id
      ? classroomNameById.get(a.classroom_id) ?? null
      : null;
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
        classroomName,
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
      classroomName,
      assignedAt: a.assigned_at,
    };
  });

  const assignTargetClassrooms = student.classroom_id
    ? classroomList.filter((c) => c.id === student.classroom_id)
    : [];

  return (
    <div className="space-y-6 overflow-x-clip pb-12">
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Student</span>
            {student.level ? (
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-700 dark:text-indigo-300">
                {student.level.toUpperCase()}
              </span>
            ) : null}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {student.full_name}
          </h1>
          {student.email ? (
            <p className="text-sm text-muted-foreground">{student.email}</p>
          ) : null}
        </div>
        <StudentInviteButton
          rosterStudentId={id}
          classroomId={student.classroom_id}
          prefillEmail={student.email}
          prefillName={student.full_name}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="min-w-0 break-words text-base">
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
                birthday={
                  (student as { birthday?: string | null }).birthday ?? null
                }
                level={student.level}
                startingOn={
                  (student as { billing_starts_on?: string | null })
                    .billing_starts_on ??
                  (student as { created_at?: string | null }).created_at ??
                  null
                }
                endedOn={
                  (student as { ended_on?: string | null }).ended_on ?? null
                }
                hasAvatar={hasAvatar}
                classrooms={classroomList}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <DiaryPanel rosterStudentId={id} entries={diary} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <StudentHistoryPanel
                rosterStudentId={id}
                classroomId={student.classroom_id}
                entries={history}
              />
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

          <StudentReportsCard
            rosterId={id}
            rosterCreatedAt={
              (student as { created_at?: string | null }).created_at ?? null
            }
            billingStartsOn={
              (student as { billing_starts_on?: string | null })
                .billing_starts_on ?? null
            }
            paidInvoices={paidInvoices}
          />
        </div>
      </div>
    </div>
  );
}
