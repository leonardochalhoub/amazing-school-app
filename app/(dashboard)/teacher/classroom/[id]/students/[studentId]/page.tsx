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
    .select("full_name, avatar_url, location")
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
      .eq("student_id", studentId)
      .limit(50_000),
    admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at")
      .eq("classroom_id", id)
      .eq("student_id", studentId)
      .limit(50_000),
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
      {/* Top bar — prominent so the teacher never loses their way
          back to the main dashboard while browsing a student's
          page. Sticky on scroll, dual CTAs (my dashboard + classroom). */}
      <div className="sticky top-16 z-30 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-400/40 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-pink-500/10 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-indigo-500/20 px-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Visualizando aluno
          </span>
          <span className="truncate font-medium">{profile.full_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/teacher/classroom/${id}`}
            className="rounded-md border border-border bg-background px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:border-indigo-400 hover:text-foreground"
          >
            ← {classroom.name}
          </Link>
          <Link
            href="/teacher"
            className="rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-1 font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            ← Minha página
          </Link>
        </div>
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
          {(profile as { location?: string | null }).location ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(profile as { location?: string | null }).location}
            </p>
          ) : null}
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
