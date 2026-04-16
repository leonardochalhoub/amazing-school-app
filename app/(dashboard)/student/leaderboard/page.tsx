import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/actions/gamification";
import { LeaderboardTable } from "@/components/gamification/leaderboard-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("classroom_members")
    .select("classroom_id, classrooms(name)")
    .eq("student_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Join a classroom to see the leaderboard.
        </p>
      </div>
    );
  }

  const classroomId = membership.classroom_id;
  const classroomName = (membership.classrooms as unknown as { name: string })?.name;
  const leaderboard = await getLeaderboard(classroomId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{classroomName}</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable
            classroomId={classroomId}
            initialData={leaderboard}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
