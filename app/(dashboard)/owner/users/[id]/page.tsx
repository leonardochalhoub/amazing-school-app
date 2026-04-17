import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isOwner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OwnerUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const owner = await isOwner();
  if (!owner) redirect("/");

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, avatar_url, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  // Auth email via admin API
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  const email = authUser?.user?.email ?? null;

  const role = profile.role as "teacher" | "student";

  if (role === "teacher") {
    const { data: classrooms } = await admin
      .from("classrooms")
      .select("id, name, invite_code")
      .eq("teacher_id", id);
    const classroomIds = (classrooms ?? []).map((c) => c.id as string);
    const { data: members } = classroomIds.length
      ? await admin
          .from("classroom_members")
          .select("student_id, classroom_id")
          .in("classroom_id", classroomIds)
      : { data: [] };
    const { data: roster } = await admin
      .from("roster_students")
      .select("id, full_name, auth_user_id, classroom_id, monthly_tuition_cents")
      .eq("teacher_id", id);

    return (
      <div className="space-y-6 pb-16">
        <Link
          href="/owner/users"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← All users
        </Link>
        <header className="space-y-1">
          <Badge variant="outline">Teacher</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            {profile.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {email ?? "—"} · joined {profile.created_at.slice(0, 10)}
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Classrooms ({classrooms?.length ?? 0})
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {(classrooms ?? []).map((c) => (
              <Card key={c.id as string}>
                <CardContent className="space-y-1 p-3">
                  <p className="font-medium">{c.name as string}</p>
                  <p className="text-xs text-muted-foreground">
                    Invite code: {c.invite_code as string} ·{" "}
                    {members?.filter(
                      (m) => (m.classroom_id as string) === (c.id as string)
                    ).length ?? 0}{" "}
                    students
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Roster ({roster?.length ?? 0})
          </h2>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Auth</th>
                  <th className="px-4 py-2 text-right">Tuition</th>
                </tr>
              </thead>
              <tbody>
                {(roster ?? []).map((r) => {
                  const tuition = (
                    r as { monthly_tuition_cents: number | null }
                  ).monthly_tuition_cents;
                  const authId = (r as { auth_user_id: string | null })
                    .auth_user_id;
                  return (
                    <tr key={r.id as string} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {authId ? (
                          <Link
                            href={`/owner/users/${authId}`}
                            className="hover:text-primary hover:underline"
                          >
                            {r.full_name as string}
                          </Link>
                        ) : (
                          r.full_name
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {authId ? "signed up" : "pending"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {tuition
                          ? new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(tuition / 100)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // Student detail
  const { data: xps } = await admin
    .from("xp_events")
    .select("xp_amount, source, source_id, created_at")
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const totalXp = (xps ?? []).reduce(
    (sum, x) => sum + ((x.xp_amount as number) ?? 0),
    0
  );

  const { data: memberships } = await admin
    .from("classroom_members")
    .select("classroom_id, classrooms(name, teacher_id)")
    .eq("student_id", id);

  const { data: progress } = await admin
    .from("lesson_progress")
    .select("lesson_slug, completed_at, total_exercises, completed_exercises")
    .eq("student_id", id)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(20);

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/owner/users"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← All users
      </Link>
      <header className="space-y-1">
        <Badge variant="outline">Student</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {email ?? "—"} · joined {profile.created_at.slice(0, 10)} · total XP{" "}
          {totalXp}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Classrooms
        </h2>
        <div className="flex flex-wrap gap-2">
          {(memberships ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Not in any classroom</p>
          ) : (
            (memberships ?? []).map((m, i) => {
              const c = (
                Array.isArray(m.classrooms) ? m.classrooms[0] : m.classrooms
              ) as { name: string; teacher_id: string } | null;
              return c ? (
                <Badge key={i} variant="outline">
                  {c.name}
                </Badge>
              ) : null;
            })
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent lessons
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Lesson</th>
                <th className="px-4 py-2 text-right">Progress</th>
                <th className="px-4 py-2 text-right">Completed</th>
              </tr>
            </thead>
            <tbody>
              {(progress ?? []).map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {p.lesson_slug as string}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {p.completed_exercises as number}/
                    {p.total_exercises as number}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {(p.completed_at as string | null)?.slice(0, 10) ?? "—"}
                  </td>
                </tr>
              ))}
              {(progress ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No lesson activity yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent XP events
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Ref</th>
                <th className="px-4 py-2 text-right">XP</th>
                <th className="px-4 py-2 text-right">At</th>
              </tr>
            </thead>
            <tbody>
              {(xps ?? []).map((x, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 capitalize">{x.source as string}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {(x.source_id as string | null) ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    +{x.xp_amount as number}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {(x.created_at as string).slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
              {(xps ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No XP yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
