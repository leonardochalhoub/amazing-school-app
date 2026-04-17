import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLessonDraft } from "@/lib/actions/lesson-drafts";
import { LessonEditor } from "@/components/teacher/lesson-editor";

export default async function LessonDraftEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const draft = await getLessonDraft(slug);
  if (!draft) notFound();

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to lessons
      </Link>

      <LessonEditor initial={draft} />
    </div>
  );
}
