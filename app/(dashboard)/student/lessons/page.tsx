import { getAllLessons } from "@/lib/content/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LessonsPage() {
  const lessons = getAllLessons();

  const categories = [...new Set(lessons.map((l) => l.category))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lessons</h1>

      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h2 className="text-lg font-semibold capitalize">{category}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {lessons
              .filter((l) => l.category === category)
              .map((lesson) => (
                <Card key={lesson.slug}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {lesson.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ~{lesson.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {lesson.exercise_count} exercises | {lesson.xp_reward} XP
                      </span>
                      <Link href={`/student/lessons/${lesson.slug}`}>
                        <Button size="sm">Start</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
