import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLessonDraft } from "@/lib/actions/lesson-drafts";
import { LessonPreviewPlayer } from "@/components/teacher/lesson-preview-player";
import { Badge } from "@/components/ui/badge";

export default async function LessonPreviewPage({
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
      <div className="flex items-center justify-between">
        <Link
          href={`/teacher/lessons/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to editor
        </Link>
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Eye className="h-3 w-3" />
          Student preview
        </Badge>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-300">
        <strong>You&apos;re seeing the student&apos;s view.</strong> This is
        read-only — nothing you do here affects student XP, progress, or
        streaks. Use it to sanity-check how the lesson flows before publishing.
      </div>

      <LessonPreviewPlayer lesson={draft.content} />
    </div>
  );
}
