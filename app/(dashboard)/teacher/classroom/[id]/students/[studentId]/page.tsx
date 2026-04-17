import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssignmentsForStudent } from "@/lib/actions/assignments";
import { listNotesForStudent } from "@/lib/actions/notes";
import { getAllLessons } from "@/lib/content/loader";
import { getAvatarSignedUrl } from "@/lib/supabase/signed-urls";
import { AvatarDisplay } from "@/components/shared/avatar-display";
import { AssignmentManager } from "@/components/teacher/assignment-manager";
import { NotesPanel } from "@/components/teacher/notes-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLevel } from "@/lib/gamification/engine";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, name, teacher_id")
    .eq("id", id)
    .maybeSingle();
  if (!classroom || classroom.teacher_id !== user.id) notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", studentId)
    .maybeSingle();

  if (!profile) {
    // Maybe it's a roster student — redirect to the roster detail page.
    const { data: roster } = await admin
      .from("roster_students")
      .select("id")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .maybeSingle();
    if (roster) redirect(`/teacher/students/${studentId}`);
    notFound();
  }

  const [assignments, notes, xpRes, progressRes] = await Promise.all([
    getAssignmentsForStudent(id, studentId),
    listNotesForStudent(id, studentId),
    admin
      .from("xp_events")
      .select("xp_amount")
      .eq("classroom_id", id)
      .eq("student_id", studentId),
    admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at")
      .eq("classroom_id", id)
      .eq("student_id", studentId),
  ]);

  const totalXp =
    (xpRes.data ?? []).reduce(
      (sum, r) => sum + (r.xp_amount as number),
      0
    ) ?? 0;
  const completedSlugs = new Set(
    (progressRes.data ?? [])
      .filter((r) => r.completed_at !== null)
      .map((r) => r.lesson_slug as string)
  );

  const signedUrl = profile.avatar_url
    ? await getAvatarSignedUrl(supabase, studentId)
    : null;

  const allLessons = getAllLessons();
  const lessonBySlug = new Map(allLessons.map((l) => [l.slug, l]));
  const enrichedAssignments = assignments.map((a) => ({
    ...a,
    lesson: lessonBySlug.get(a.lesson_slug),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/teacher/classroom/${id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {classroom.name}
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <AvatarDisplay
          fullName={profile.full_name}
          signedUrl={signedUrl}
          className="h-16 w-16"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {profile.full_name}
          </h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            Lv.{getLevel(totalXp)} · {totalXp} XP · {completedSlugs.size} lessons completed
          </p>
          <div className="mt-1 flex gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {enrichedAssignments.length} assigned
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentManager
              classroomId={id}
              studentId={studentId}
              assignments={enrichedAssignments}
              allLessons={allLessons}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <NotesPanel
              classroomId={id}
              studentId={studentId}
              notes={notes}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
