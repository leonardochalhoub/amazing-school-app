import { getStudentStats } from "@/lib/actions/gamification";
import { getStudentClassrooms } from "@/lib/actions/classroom";
import { getUpcomingClasses } from "@/lib/actions/schedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XpBar } from "@/components/gamification/xp-bar";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import Link from "next/link";

export default async function StudentDashboard() {
  const stats = await getStudentStats();
  const classrooms = await getStudentClassrooms();

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Welcome! Join a classroom to get started.</p>
            <Link href="/student/join"><Button>Join a Classroom</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstClassroom = classrooms?.[0] as unknown as Record<string, unknown> | undefined;
  const upcomingClasses = firstClassroom
    ? await getUpcomingClasses(firstClassroom.id as string)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <XpBar currentXp={stats.totalXp} level={stats.level} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreakCounter streakDays={stats.streak} size="lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <span className="font-bold">{stats.totalXp}</span> total XP
            </p>
            <p className="text-sm">
              <span className="font-bold">{stats.lessonsCompleted}</span> lessons
              completed
            </p>
            <p className="text-sm">
              <span className="font-bold">{stats.earnedBadges.length}</span> badges
              earned
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/student/lessons" className="block">
              <Button variant="outline" className="w-full justify-start">
                📖 Continue Learning
              </Button>
            </Link>
            <Link href="/student/chat" className="block">
              <Button variant="outline" className="w-full justify-start">
                🤖 Practice with AI Tutor
              </Button>
            </Link>
            <Link href="/student/leaderboard" className="block">
              <Button variant="outline" className="w-full justify-start">
                🏆 View Leaderboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming classes.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.slice(0, 3).map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{cls.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cls.scheduled_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <a
                      href={cls.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        Join
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid
            earnedBadges={stats.earnedBadges}
            allBadges={stats.allBadges}
          />
        </CardContent>
      </Card>

      {classrooms?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t joined any classroom yet.
            </p>
            <Link href="/student/join">
              <Button>Join a Classroom</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
