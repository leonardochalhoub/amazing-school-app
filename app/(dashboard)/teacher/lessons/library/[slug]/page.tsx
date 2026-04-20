import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Users2,
  Clock,
  Trophy,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLesson } from "@/lib/content/loader";
import { getCharacters } from "@/lib/content/scenes";
import type { NarrativeLesson, LessonScene } from "@/lib/content/scenes";
import { getTeacherOverview } from "@/lib/actions/teacher-dashboard";
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isTeacherRole } from "@/lib/auth/roles";

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
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/student");

  const { slug } = await params;
  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const asNarrative = lesson as unknown as NarrativeLesson;
  const scenes: LessonScene[] = Array.isArray(asNarrative.scenes)
    ? asNarrative.scenes
    : [];
  const chars = Object.fromEntries(getCharacters().map((c) => [c.id, c]));

  const [overview, assignable] = await Promise.all([
    getTeacherOverview(),
    getAssignableLessons(),
  ]);

  const counts = {
    narrative: scenes.filter((s) => s.kind === "narrative").length,
    dialogue: scenes.filter((s) => s.kind === "dialogue").length,
    vocab: scenes.filter((s) => s.kind === "vocab_intro").length,
    grammar: scenes.filter((s) => s.kind === "grammar_note").length,
    exercise: scenes.filter((s) => s.kind === "exercise").length,
  };

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/teacher/lessons?source=library"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to lessons
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {lesson.title}
            </h1>
            <Badge variant="default" className="gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Published
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {lesson.cefr_level.toUpperCase()} · {lesson.category} ·{" "}
            <span className="font-mono">{slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/student/lessons/${slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            View as student
          </Link>
          <AssignLessonButton
            lessons={assignable}
            classrooms={overview.classrooms.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            students={overview.roster.map((r) => ({
              id: r.id,
              fullName: r.fullName,
              classroomId: r.classroomId,
            }))}
            variant="primary"
            label="Assign"
          />
        </div>
      </header>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm leading-relaxed">{lesson.description}</p>
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
              {scenes.length > 0
                ? `${scenes.length} scenes`
                : `${(lesson as { exercises?: unknown[] }).exercises?.length ?? 0} exercises`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users2 className="h-3.5 w-3.5" />
              Library (core)
            </span>
          </div>
          {asNarrative.summary_pt_br ? (
            <p className="rounded-lg bg-muted/30 p-3 text-xs italic leading-relaxed text-muted-foreground">
              {asNarrative.summary_pt_br}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {scenes.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scene breakdown
            </h2>
            <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {counts.narrative} narrative
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {counts.dialogue} dialogue
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {counts.vocab} vocab
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {counts.grammar} grammar
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {counts.exercise} exercise
              </Badge>
            </div>
          </div>

          <ol className="space-y-3">
            {scenes.map((scene, i) => (
              <li key={i}>
                <Link
                  href={`/student/lessons/${slug}?scene=${i}`}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold group-hover:bg-primary group-hover:text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <ScenePreview scene={scene} chars={chars} />
                  </div>
                  <span className="shrink-0 self-center text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                    Open →
                  </span>
                </Link>
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
          {scene.exercise.question ??
            `Match ${scene.exercise.pairs?.length ?? 0} pairs`}
        </p>
        {scene.exercise.hint_pt_br ? (
          <p className="mt-0.5 text-[11px] italic text-muted-foreground">
            🇧🇷 {scene.exercise.hint_pt_br}
          </p>
        ) : null}
      </>
    );
  }
  if (scene.kind === "pronunciation") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">
          Pronunciation · record &amp; score
        </p>
        <p className="mt-0.5 text-sm font-medium line-clamp-2">
          {scene.target_en}
        </p>
        {scene.target_pt ? (
          <p className="mt-0.5 text-[11px] italic text-muted-foreground">
            🇧🇷 {scene.target_pt}
          </p>
        ) : null}
      </>
    );
  }
  if (scene.kind === "dialog_pronunciation") {
    const userTurns = scene.turns.filter((t) => t.speaker === "user").length;
    const aiTurns = scene.turns.length - userTurns;
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
          Dialog drill · {scene.turns.length} turns ({aiTurns} AI / {userTurns} you)
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.title}
          {scene.character ? ` — with ${scene.character}` : ""}
        </p>
        {scene.pt_summary ? (
          <p className="mt-0.5 text-[11px] italic text-muted-foreground line-clamp-2">
            🇧🇷 {scene.pt_summary}
          </p>
        ) : null}
      </>
    );
  }
  if (scene.kind === "reading") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          Reading
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.title ?? "Recap reading"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
          {scene.passage_en}
        </p>
      </>
    );
  }
  if (scene.kind === "listening") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600">
          Listening · short clip
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.title ?? "Listen"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
          {scene.audio_text_en}
        </p>
      </>
    );
  }
  if (scene.kind === "listening_story") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
          Listening story · {scene.paragraphs.length} paragraphs · write response
        </p>
        <p className="mt-0.5 text-sm font-medium">{scene.title}</p>
        <p className="mt-0.5 text-[11px] italic text-muted-foreground line-clamp-2">
          {scene.prompt_en}
        </p>
      </>
    );
  }
  if (scene.kind === "further_reading") {
    return (
      <>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
          Further reading · {scene.sources.length} links
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {scene.title ?? "Go deeper"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
          {scene.sources.map((s) => s.label).join(" · ")}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {(scene as { kind: string }).kind}
      </p>
      <p className="mt-0.5 text-xs italic text-muted-foreground">
        (no preview available)
      </p>
    </>
  );
}