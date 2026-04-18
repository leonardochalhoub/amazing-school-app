import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Sparkles, Eye, Clock, Trophy, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLesson } from "@/lib/content/loader";
import { getCharacters } from "@/lib/content/scenes";
import type { NarrativeLesson, LessonScene } from "@/lib/content/scenes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TeacherLibraryLessonPage({
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
  if (profile?.role !== "teacher") redirect("/student");

  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const asNarrative = lesson as unknown as NarrativeLesson;
  const scenes: LessonScene[] = Array.isArray(asNarrative.scenes)
    ? asNarrative.scenes
    : [];
  const chars = Object.fromEntries(getCharacters().map((c) => [c.id, c]));

  const exerciseCount = scenes.filter((s) => s.kind === "exercise").length;
  const dialogueCount = scenes.filter((s) => s.kind === "dialogue").length;
  const vocabCount = scenes.filter((s) => s.kind === "vocab_intro").length;
  const narrativeCount = scenes.filter((s) => s.kind === "narrative").length;
  const grammarCount = scenes.filter((s) => s.kind === "grammar_note").length;

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/teacher/lessons?source=library"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to library
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Core library</Badge>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {lesson.category}
          </Badge>
          <Badge variant="outline">{lesson.cefr_level.toUpperCase()}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="text-sm text-muted-foreground">{lesson.description}</p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {lesson.estimated_minutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            {lesson.xp_reward} XP
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {scenes.length > 0 ? `${scenes.length} scenes` : `${(lesson as { exercises?: unknown[] }).exercises?.length ?? 0} exercises`}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/student/lessons/${slug}`}>
          <Button className="gap-1">
            <Eye className="h-4 w-4" />
            See as student
          </Button>
        </Link>
      </div>

      {asNarrative.summary_pt_br ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Teacher notes (PT-BR)
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {asNarrative.summary_pt_br}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {scenes.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scene breakdown
            </h2>
            <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {narrativeCount} narrative
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {dialogueCount} dialogue
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {vocabCount} vocab
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {grammarCount} grammar
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {exerciseCount} exercise
              </Badge>
            </div>
          </div>

          <ol className="space-y-3">
            {scenes.map((scene, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <ScenePreview scene={scene} chars={chars} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function ScenePreview({
  scene,
  chars,
}: {
  scene: LessonScene;
  chars: Record<string, { name: string; emoji: string; color: string }>;
}) {
  if (scene.kind === "chapter_title") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Chapter title
        </p>
        <p className="mt-0.5 font-semibold">{scene.chapter}</p>
        {scene.subtitle_en ? (
          <p className="text-xs text-muted-foreground italic">
            {scene.subtitle_en}
          </p>
        ) : null}
      </>
    );
  }
  if (scene.kind === "narrative") {
    const char = scene.character_id ? chars[scene.character_id] : null;
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Narrative{" "}
          {char ? (
            <span style={{ color: char.color }}>
              · {char.emoji} {char.name}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm italic text-muted-foreground line-clamp-3">
          {scene.text_en}
        </p>
      </>
    );
  }
  if (scene.kind === "dialogue") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dialogue
          {scene.location_en ? ` · ${scene.location_en}` : ""}
        </p>
        <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
          {scene.turns.slice(0, 2).map((t, i) => {
            const c = chars[t.character_id];
            return (
              <li key={i} className="truncate">
                {c ? (
                  <strong style={{ color: c.color }}>{c.name}:</strong>
                ) : null}{" "}
                {t.en}
              </li>
            );
          })}
          {scene.turns.length > 2 ? (
            <li>…{scene.turns.length - 2} more turn(s)</li>
          ) : null}
        </ul>
      </>
    );
  }
  if (scene.kind === "vocab_intro") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Vocabulary · {scene.items.length} items
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.title ?? "New vocabulary"}
        </p>
        <p className="text-xs text-muted-foreground">
          {scene.items
            .slice(0, 4)
            .map((it) => it.term)
            .join(" · ")}
          {scene.items.length > 4 ? " · …" : ""}
        </p>
      </>
    );
  }
  if (scene.kind === "grammar_note") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
          Grammar note
        </p>
        <p className="mt-0.5 text-sm font-medium">{scene.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {scene.body_en}
        </p>
      </>
    );
  }
  if (scene.kind === "exercise") {
    const t = scene.exercise.type.replace(/_/g, " ");
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
          Exercise · {t}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.exercise.question ?? `Match ${scene.exercise.pairs?.length ?? 0} pairs`}
        </p>
        {scene.exercise.hint_pt_br ? (
          <p className="mt-0.5 text-[11px] italic text-muted-foreground">
            🇧🇷 {scene.exercise.hint_pt_br}
          </p>
        ) : null}
      </>
    );
  }
  return null;
}
