"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  PlayCircle,
  Pencil,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/context";
import {
  cambridgeUrl,
  type MusicExercise,
  type MusicSong,
  type SingAlongPrompt,
} from "@/lib/content/music";
import { submitExerciseResponse } from "@/lib/actions/exercise-responses";
import type {
  ExerciseAnswer,
  ExerciseResponseRow,
} from "@/lib/actions/exercise-responses-types";

interface Props {
  song: MusicSong;
  lessonSlug: string;
  initialResponses: ExerciseResponseRow[];
}

export function MusicBoard({ song, lessonSlug, initialResponses }: Props) {
  const { locale } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostname = new URL(song.full_lyrics_url).hostname;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${song.artist} ${song.title} official`
  )}`;

  const [responses, setResponses] =
    useState<Record<number, ExerciseResponseRow>>(() => {
      const map: Record<number, ExerciseResponseRow> = {};
      for (const r of initialResponses) map[r.exercise_index] = r;
      return map;
    });

  function upsertLocal(r: ExerciseResponseRow) {
    setResponses((prev) => ({ ...prev, [r.exercise_index]: r }));
  }

  const seekTo = useCallback((seconds: number) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }),
      "*"
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*"
    );
  }, []);

  const embedSrc =
    `https://www.youtube.com/embed/${song.youtube_id}` +
    `?enablejsapi=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=en`;

  const [first, ...rest] = song.exercises;

  const firstListenAndFill = song.exercises.find(
    (e) => e.type === "listen_and_fill"
  ) as Extract<MusicExercise, { type: "listen_and_fill" }> | undefined;

  const singAlongPrompts: SingAlongPrompt[] =
    song.sing_along?.prompts && song.sing_along.prompts.length > 0
      ? song.sing_along.prompts
      : firstListenAndFill
        ? [
            {
              label_en: "Sing with the singer",
              label_pt: "Cante junto",
              lines: [
                [
                  firstListenAndFill.excerpt_before,
                  firstListenAndFill.answer,
                  firstListenAndFill.excerpt_after,
                ]
                  .filter(Boolean)
                  .join(" "),
              ],
              start_seconds: firstListenAndFill.youtube_start,
              style: "chorus",
            },
          ]
        : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-black">
              <iframe
                ref={iframeRef}
                src={embedSrc}
                title={`${song.title} — ${song.artist}`}
                className="h-full w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {song.why_this_song}
              </p>
              <p className="text-[11px] text-muted-foreground">
                💡{" "}
                {locale === "pt-BR"
                  ? "Clique no botão CC do player para legenda sincronizada."
                  : "Click the CC button on the player for synced captions."}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <a
                  href={song.full_lyrics_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  {locale === "pt-BR" ? "Letra completa" : "Full lyrics"} ·{" "}
                  {hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {locale === "pt-BR" ? "Vídeo falhou? Buscar" : "Video not working? Search"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {first ? (
          <ExerciseCard
            exercise={first}
            index={0}
            lessonSlug={lessonSlug}
            response={responses[0] ?? null}
            onResponse={upsertLocal}
            onSeek={seekTo}
            singAlongPrompts={singAlongPrompts}
            vocabHint={song.vocab_hooks.slice(0, 2)}
          />
        ) : null}
      </div>

      {rest.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            {locale === "pt-BR" ? "Mais exercícios" : "More exercises"}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {rest.map((ex, i) => (
              <ExerciseCard
                key={i + 1}
                exercise={ex}
                index={i + 1}
                lessonSlug={lessonSlug}
                response={responses[i + 1] ?? null}
                onResponse={upsertLocal}
                onSeek={seekTo}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ExerciseCard({
  exercise,
  index,
  lessonSlug,
  response,
  onResponse,
  onSeek,
  singAlongPrompts,
  vocabHint,
}: {
  exercise: MusicExercise;
  index: number;
  lessonSlug: string;
  response: ExerciseResponseRow | null;
  onResponse: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
  singAlongPrompts?: SingAlongPrompt[];
  vocabHint?: { term: string; pt: string; note: string }[];
}) {
  const { locale } = useI18n();

  const titleByType: Record<MusicExercise["type"], { en: string; pt: string }> = {
    listen_and_fill: { en: exercise.prompt_en, pt: exercise.prompt_pt },
    translate_line: { en: exercise.prompt_en, pt: exercise.prompt_pt },
    discussion: { en: exercise.prompt_en, pt: exercise.prompt_pt },
    spot_the_grammar: {
      en: `${exercise.prompt_en} (write the full form)`,
      pt: `${exercise.prompt_pt} (escreva a forma completa)`,
    },
  };
  const prompt = locale === "pt-BR" ? titleByType[exercise.type].pt : titleByType[exercise.type].en;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {locale === "pt-BR" ? "Exercício" : "Exercise"} {index + 1}
      </p>
      <p className="mt-1 text-sm font-medium">{prompt}</p>
      <div className="mt-4">
        {exercise.type === "listen_and_fill" ? (
          <ListenAndFill
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
            onSeek={onSeek}
            singAlongPrompts={singAlongPrompts ?? []}
            vocabHint={vocabHint ?? []}
          />
        ) : exercise.type === "translate_line" ? (
          <TranslateLine exercise={exercise} />
        ) : exercise.type === "discussion" ? (
          <Discussion
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
          />
        ) : exercise.type === "spot_the_grammar" ? (
          <SpotTheGrammar
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
          />
        ) : null}
      </div>
    </div>
  );
}

function ListenAndFill({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
  onSeek,
  singAlongPrompts,
  vocabHint,
}: {
  exercise: Extract<MusicExercise, { type: "listen_and_fill" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
  singAlongPrompts: SingAlongPrompt[];
  vocabHint: { term: string; pt: string; note: string }[];
}) {
  const { locale } = useI18n();
  const savedText =
    initial?.answer.type === "listen_and_fill" ? initial.answer.text : null;

  const [value, setValue] = useState(savedText ?? "");
  const [checked, setChecked] = useState<null | "correct" | "wrong">(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(savedText ?? "");
  }, [savedText]);

  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[.,!?;:'"]/g, "");

  function check() {
    const isCorrect = normalize(value) === normalize(exercise.answer);
    setChecked(isCorrect ? "correct" : "wrong");
    startTransition(async () => {
      const r = await submitExerciseResponse({
        lessonSlug,
        exerciseIndex,
        answer: { type: "listen_and_fill", text: value.trim() },
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.response) {
        onSaved(r.response);
      }
    });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onSeek(exercise.youtube_start)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        {locale === "pt-BR"
          ? `Tocar ${fmt(exercise.youtube_start)} – ${fmt(exercise.youtube_end)}`
          : `Play ${fmt(exercise.youtube_start)} – ${fmt(exercise.youtube_end)}`}
      </button>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{exercise.excerpt_before}</span>
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setChecked(null);
          }}
          placeholder={exercise.blank_hint}
          className="h-8 w-40"
        />
        <span>{exercise.excerpt_after}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={check}
          disabled={pending || value.trim() === ""}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {pending
            ? locale === "pt-BR"
              ? "Verificando…"
              : "Checking…"
            : locale === "pt-BR"
              ? "Verificar"
              : "Check"}
        </Button>
        {checked === "correct" ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {locale === "pt-BR" ? "Correto!" : "Correct!"}
          </span>
        ) : checked === "wrong" ? (
          <span className="inline-flex items-center gap-1 text-xs text-rose-600">
            <XCircle className="h-4 w-4" />
            {locale === "pt-BR"
              ? `Resposta: ${exercise.answer}`
              : `Answer: ${exercise.answer}`}
          </span>
        ) : initial && checked === null ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {locale === "pt-BR"
              ? `Enviado em ${formatWhen(initial.updated_at, locale)}`
              : `Sent on ${formatWhen(initial.updated_at, locale)}`}
          </span>
        ) : null}
      </div>

      {singAlongPrompts.length > 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            🎤 {locale === "pt-BR" ? "Cante junto" : "Sing along"}
          </p>
          <div className="space-y-2">
            {singAlongPrompts.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-primary">
                    {locale === "pt-BR" ? p.label_pt : p.label_en}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSeek(p.start_seconds)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
                  >
                    <PlayCircle className="h-3 w-3" />
                    {fmt(p.start_seconds)}
                  </button>
                </div>
                <ul className="mt-2 space-y-0.5 text-sm font-medium italic leading-snug">
                  {p.lines.map((line, li) => (
                    <li key={li}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {vocabHint.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {vocabHint.map((v) => (
                <a
                  key={v.term}
                  href={cambridgeUrl(v.term)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-primary/30 px-2 py-0.5 transition-colors hover:bg-primary/10"
                  title={`${v.note} · Cambridge Dictionary`}
                >
                  <strong className="font-medium underline decoration-dotted underline-offset-2">
                    {v.term}
                  </strong>
                  <span className="ml-1 text-muted-foreground">· {v.pt}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TranslateLine({
  exercise,
}: {
  exercise: Extract<MusicExercise, { type: "translate_line" }>;
}) {
  const { locale } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-3">
      <blockquote className="rounded-md border-l-2 border-primary/60 bg-muted/40 p-3 text-sm italic">
        {exercise.excerpt}
      </blockquote>
      <Button size="sm" variant="outline" onClick={() => setShow((v) => !v)}>
        {show ? (
          <>
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            {locale === "pt-BR" ? "Ocultar tradução" : "Hide translation"}
          </>
        ) : (
          <>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {locale === "pt-BR" ? "Ver tradução sugerida" : "Show model translation"}
          </>
        )}
      </Button>
      {show ? (
        <div className="rounded-md border border-dashed border-border bg-card p-3 text-sm">
          {exercise.model_answer_pt}
        </div>
      ) : null}
    </div>
  );
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  return locale === "pt-BR"
    ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function Discussion({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "discussion" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const savedText =
    initial?.answer.type === "discussion" ? initial.answer.text : null;
  const [text, setText] = useState(savedText ?? "");
  const [editing, setEditing] = useState(savedText === null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setText(savedText ?? "");
    setEditing(savedText === null);
  }, [savedText]);

  function send() {
    if (text.trim().length === 0) return;
    startTransition(async () => {
      const answer: ExerciseAnswer = { type: "discussion", text: text.trim() };
      const r = await submitExerciseResponse({
        lessonSlug,
        exerciseIndex,
        answer,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.response) {
        onSaved(r.response);
        setEditing(false);
        toast.success(locale === "pt-BR" ? "Resposta enviada" : "Answer sent");
      }
    });
  }

  return (
    <div className="space-y-3">
      {exercise.target_vocab.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {exercise.target_vocab.map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {v}
            </span>
          ))}
        </div>
      ) : null}

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              locale === "pt-BR"
                ? "Escreva sua resposta aqui…"
                : "Write your answer here…"
            }
            className="min-h-[100px] w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={send}
              disabled={pending || text.trim().length === 0}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {pending
                ? locale === "pt-BR"
                  ? "Enviando…"
                  : "Sending…"
                : initial
                  ? locale === "pt-BR"
                    ? "Salvar alterações"
                    : "Save changes"
                  : locale === "pt-BR"
                    ? "Enviar"
                    : "Send"}
            </Button>
            {initial ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText(savedText ?? "");
                  setEditing(false);
                }}
                disabled={pending}
              >
                {locale === "pt-BR" ? "Cancelar" : "Cancel"}
              </Button>
            ) : null}
          </div>
        </>
      ) : initial ? (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
            {savedText}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {locale === "pt-BR"
                ? `Enviado em ${formatWhen(initial.updated_at, locale)}`
                : `Sent on ${formatWhen(initial.updated_at, locale)}`}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="gap-1.5"
            >
              <Pencil className="h-3 w-3" />
              {locale === "pt-BR" ? "Editar" : "Edit"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SpotTheGrammar({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "spot_the_grammar" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();

  const savedEntries =
    initial?.answer.type === "spot_the_grammar" ? initial.answer.entries : null;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const e of exercise.expected) map[e.short] = "";
    if (savedEntries) {
      for (const s of savedEntries) map[s.short] = s.full;
    }
    return map;
  });

  useEffect(() => {
    if (!savedEntries) return;
    const map: Record<string, string> = {};
    for (const e of exercise.expected) map[e.short] = "";
    for (const s of savedEntries) map[s.short] = s.full;
    setValues(map);
  }, [savedEntries, exercise.expected]);

  const [result, setResult] = useState<
    null | { correct: number; total: number }
  >(null);

  function normalize(s: string) {
    return s.trim().toLowerCase().replace(/[.,!?;:'"]/g, "");
  }

  function send() {
    const entries = exercise.expected.map((e) => ({
      short: e.short,
      full: values[e.short] ?? "",
    }));

    let correct = 0;
    for (const e of exercise.expected) {
      if (normalize(values[e.short] ?? "") === normalize(e.full)) correct++;
    }
    setResult({ correct, total: exercise.expected.length });

    startTransition(async () => {
      const answer: ExerciseAnswer = {
        type: "spot_the_grammar",
        entries,
      };
      const r = await submitExerciseResponse({
        lessonSlug,
        exerciseIndex,
        answer,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.response) {
        onSaved(r.response);
        toast.success(
          locale === "pt-BR"
            ? `Enviado (${correct}/${exercise.expected.length} corretas)`
            : `Sent (${correct}/${exercise.expected.length} correct)`
        );
      }
    });
  }

  const hasAnyInput = Object.values(values).some((v) => v.trim().length > 0);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {exercise.expected.map((e) => {
          const current = normalize(values[e.short] ?? "");
          const expected = normalize(e.full);
          const isCorrect = result !== null && current === expected;
          const isWrong =
            result !== null && current.length > 0 && current !== expected;
          return (
            <li key={e.short} className="flex items-center gap-2 text-sm">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {e.short}
              </code>
              <span className="text-muted-foreground">→</span>
              <Input
                value={values[e.short] ?? ""}
                onChange={(ev) =>
                  setValues((prev) => ({ ...prev, [e.short]: ev.target.value }))
                }
                placeholder={
                  locale === "pt-BR" ? "forma completa" : "full form"
                }
                className={`h-8 w-48 ${
                  isCorrect
                    ? "border-emerald-500/60"
                    : isWrong
                      ? "border-rose-500/60"
                      : ""
                }`}
              />
              {isCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : isWrong ? (
                <span className="text-[11px] text-rose-600">
                  {locale === "pt-BR" ? `é "${e.full}"` : `is "${e.full}"`}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={send}
          disabled={pending || !hasAnyInput}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {pending
            ? locale === "pt-BR"
              ? "Enviando…"
              : "Sending…"
            : initial
              ? locale === "pt-BR"
                ? "Reenviar"
                : "Resend"
              : locale === "pt-BR"
                ? "Enviar"
                : "Send"}
        </Button>
        {result ? (
          <span className="text-xs text-muted-foreground">
            {result.correct}/{result.total}{" "}
            {locale === "pt-BR" ? "corretas" : "correct"}
          </span>
        ) : null}
        {initial && !result ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {locale === "pt-BR"
              ? `Enviado em ${formatWhen(initial.updated_at, locale)}`
              : `Sent on ${formatWhen(initial.updated_at, locale)}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
