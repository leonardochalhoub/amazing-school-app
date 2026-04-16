import { getTeacherClassrooms } from "@/lib/actions/classroom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TeacherDashboard() {
  const classrooms = await getTeacherClassrooms();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Classrooms</h1>
        <Link href="/teacher/classroom/new">
          <Button>+ New Classroom</Button>
        </Link>
      </div>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t created any classrooms yet.
            </p>
            <Link href="/teacher/classroom/new">
              <Button>Create Your First Classroom</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom: { id: string; name: string; description: string | null; invite_code: string; classroom_members: { count: number }[] }) => (
            <Link
              key={classroom.id}
              href={`/teacher/classroom/${classroom.id}`}
            >
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{classroom.name}</CardTitle>
                  {classroom.description && (
                    <p className="text-sm text-muted-foreground">
                      {classroom.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      Code: {classroom.invite_code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {classroom.classroom_members?.[0]?.count ?? 0} students
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
