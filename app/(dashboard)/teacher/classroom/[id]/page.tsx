import { getClassroomDetails } from "@/lib/actions/classroom";
import { getAssignedLessons } from "@/lib/actions/lessons";
import { getUpcomingClasses } from "@/lib/actions/schedule";
import { getLevel } from "@/lib/gamification/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default async function ClassroomDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClassroomDetails(id);

  if (!data) {
    return <p className="text-center text-muted-foreground">Classroom not found.</p>;
  }

  const { classroom, members } = data;
  const assignments = await getAssignedLessons(id);
  const upcomingClasses = await getUpcomingClasses(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{classroom.name}</h1>
        {classroom.description && (
          <p className="text-muted-foreground">{classroom.description}</p>
        )}
        <Badge variant="outline" className="mt-2">
          Invite Code: {classroom.invite_code}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Link href={`/teacher/classroom/${id}/assign`}>
          <Button variant="outline" size="sm">Assign Lesson</Button>
        </Link>
        <Link href={`/teacher/classroom/${id}/schedule`}>
          <Button variant="outline" size="sm">Schedule Class</Button>
        </Link>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Students ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students yet. Share the invite code!
              </p>
            ) : (
              <div className="space-y-3">
                {members
                  .sort((a, b) => b.total_xp - a.total_xp)
                  .map((member) => (
                    <div
                      key={member.student_id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {member.full_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Lv.{getLevel(member.total_xp)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {member.total_xp} XP
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming classes scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((cls) => (
                  <div key={cls.id} className="space-y-1">
                    <p className="text-sm font-medium">{cls.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cls.scheduled_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Assigned Lessons ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lessons assigned yet.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm">{a.lesson_slug}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.assigned_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
