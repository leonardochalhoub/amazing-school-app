import { redirect } from "next/navigation";
import Link from "next/link";
import { isOwner } from "@/lib/auth/roles";
import { listAllUsers } from "@/lib/actions/owner-users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users2 } from "lucide-react";

export default async function OwnerUsersPage() {
  const owner = await isOwner();
  if (!owner) redirect("/");

  const result = await listAllUsers();
  if ("error" in result) {
    return <p className="py-12 text-center text-destructive">{result.error}</p>;
  }

  const teachers = result.filter((u) => u.role === "teacher");
  const students = result.filter((u) => u.role === "student");

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Owner
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Every registered account. Click a name to open their page.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{teachers.length}</p>
              <p className="text-xs text-muted-foreground">Teachers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{students.length}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Teachers
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right">Classrooms</th>
                <th className="px-4 py-2 text-right">Students</th>
                <th className="px-4 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/owner/users/${t.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {t.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {t.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.classroomCount ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {t.studentCount ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {t.created_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
              {teachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No teachers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Students
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Teacher</th>
                <th className="px-4 py-2 text-right">XP</th>
                <th className="px-4 py-2 text-right">Last active</th>
                <th className="px-4 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      href={`/owner/users/${s.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.teacherName ?? (
                      <Badge variant="outline" className="text-[10px]">
                        unassigned
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {s.totalXp ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {s.lastActivity ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {s.created_at.slice(0, 10)}
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
    </div>
  );
}
