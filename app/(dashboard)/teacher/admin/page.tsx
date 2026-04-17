import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherDashboardData } from "@/lib/actions/teacher-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, Trophy, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function TeacherAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/");

  const data = await getTeacherDashboardData();
  const students = [...data.students].sort((a, b) => b.totalXp - a.totalXp);

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Teacher admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Macro view of everything running across your classrooms.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi
          label="Students"
          value={data.kpis.totalStudents}
          icon={<Users className="h-4 w-4" />}
        />
        <Kpi
          label="Active today"
          value={data.kpis.activeToday}
          icon={<Flame className="h-4 w-4" />}
        />
        <Kpi
          label="Lessons / week"
          value={data.kpis.lessonsThisWeek}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <Kpi
          label="XP / week"
          value={data.kpis.xpThisWeek}
          icon={<Trophy className="h-4 w-4" />}
        />
        <Kpi
          label="Avg streak"
          value={data.kpis.avgStreak}
          icon={<Flame className="h-4 w-4" />}
        />
        <Kpi
          label="Classrooms"
          value={data.kpis.totalClassrooms}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top students by XP
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Classroom</th>
                <th className="px-4 py-2 text-right">XP</th>
                <th className="px-4 py-2 text-right">Lessons</th>
                <th className="px-4 py-2 text-right">Streak</th>
                <th className="px-4 py-2 text-right">Last active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/teacher/students/${s.studentId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.classroomName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.totalXp}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.completed}/{s.assigned}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.streak}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {s.lastActivity ?? "—"}
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No students yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Classrooms
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.classrooms.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-1 p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.studentCount} students · code {c.inviteCode}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
