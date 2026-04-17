import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LessonBuilder } from "@/components/teacher/lesson-builder";

export default function NewTeacherLessonPage() {
  return (
    <div className="space-y-4 pb-16">
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to lessons
      </Link>
      <LessonBuilder />
    </div>
  );
}
