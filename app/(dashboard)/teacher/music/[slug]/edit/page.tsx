import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadMusicSong } from "@/lib/content/music-server";
import { getMyMusicOverride } from "@/lib/actions/music-overrides";
import { MusicOverrideEditor } from "@/components/teacher/music-override-editor";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MusicExercise, SingAlongPrompt } from "@/lib/content/music";
import { isTeacherRole } from "@/lib/auth/roles";

export default async function TeacherMusicEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/student");

  const { slug } = await params;
  const song = await loadMusicSong(slug);
  if (!song) notFound();

  const override = await getMyMusicOverride(slug);

  const initialSingAlong =
    (override?.sing_along as { prompts: SingAlongPrompt[] } | null) ??
    song.sing_along ??
    { prompts: [] };
  const initialExercises =
    (override?.exercises as MusicExercise[] | null) ?? song.exercises;

  return (
    <div className="space-y-4 pb-16">
      <Link
        href={`/teacher/music/${slug}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to song
      </Link>
      <MusicOverrideEditor
        song={song}
        initialSingAlong={initialSingAlong}
        initialExercises={initialExercises}
        hasOverride={override !== null}
      />
    </div>
  );
}