import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LessonBuilder } from "@/components/teacher/lesson-builder";
import { getMyTeacherLessonBySlug } from "@/lib/actions/teacher-lessons";

export default async function EditTeacherLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await getMyTeacherLessonBySlug(slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-4 pb-16">
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to lessons
      </Link>
      <LessonBuilder initial={lesson} />
    </div>
  );
}
