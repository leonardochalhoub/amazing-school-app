"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { assignLesson } from "@/lib/actions/lessons";
import { getAllLessons } from "@/lib/content/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AssignLessonPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const lessons = getAllLessons();
  const [assigning, setAssigning] = useState<string | null>(null);

  async function handleAssign(slug: string) {
    setAssigning(slug);
    const result = await assignLesson(classroomId, slug);
    if (result.error) {
      alert(result.error);
    } else {
      router.push(`/teacher/classroom/${classroomId}`);
    }
    setAssigning(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Assign Lesson</h1>

      <div className="space-y-3">
        {lessons.map((lesson) => (
          <Card key={lesson.slug}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{lesson.title}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {lesson.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {lesson.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ~{lesson.estimated_minutes} min | {lesson.xp_reward} XP
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleAssign(lesson.slug)}
                disabled={assigning === lesson.slug}
              >
                {assigning === lesson.slug ? "Assigning..." : "Assign"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
