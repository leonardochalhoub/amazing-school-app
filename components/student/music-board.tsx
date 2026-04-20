"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
  letrasUrl,
  type MusicExercise,
  type MusicSong,
  type SingAlongPrompt,
} from "@/lib/content/music";
import { useVocabTranslations } from "@/lib/use-vocab-translations";
import { submitExerciseResponse } from "@/lib/actions/exercise-responses";
import type {
  ExerciseAnswer,
  ExerciseResponseRow,
} from "@/lib/actions/exercise-responses-types";

interface Props {
  song: MusicSong;
  lessonSlug: string;
  initialResponses: ExerciseResponseRow[];
  demoMode?: boolean;
}

const DemoModeContext = createContext<boolean>(false);

function useSafeSubmit() {
  const isDemo = useContext(DemoModeContext);
  const { locale } = useI18n();
  return async (
    params: Parameters<typeof submitExerciseResponse>[0]
  ): ReturnType<typeof submitExerciseResponse> => {
    if (isDemo) {
      toast.info(
        locale === "pt-BR"
          ? "Modo demo — crie uma conta para salvar sua resposta."
          : "Demo mode — sign up to save your answer.",
        {
          action: {
            label: locale === "pt-BR" ? "Criar conta" : "Sign up",
            onClick: () => {
              window.location.href = "/login";
            },
          },
        }
      );
      return {
        success: true as const,
        response: {
          id: `demo-${Math.random().toString(36).slice(2)}`,
          lesson_slug: params.lessonSlug,
          exercise_index: params.exerciseIndex,
          exercise_type: params.answer.type,
          answer: params.answer,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
    return submitExerciseResponse(params);
  };
}

export function MusicBoard({
  song,
  lessonSlug,
  initialResponses,
  demoMode = false,
}: Props) {
  const { locale } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostname = song.full_lyrics_url
    ? (() => {
        try {
          return new URL(song.full_lyrics_url).hostname;
        } catch {
          return "";
        }
      })()
    : "";
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

  // Origin param is required for YouTube IFrame API postMessage to work
  // reliably on cross-origin pages (silently ignored otherwise). We set it
  // client-side so the iframe mounts with the real origin.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    // Seek + play via IFrame API. No src reload — reloading with
    // &autoplay=1 fails on mobile (iOS/Android block autoplay) and the
    // user is left staring at a paused thumbnail. postMessage works as
    // long as the user has tapped Play at least once on the iframe.
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [seconds, true],
      }),
      "*"
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*"
    );
  }, []);

  // Default host is youtube-nocookie.com (privacy-enhanced, fewer
  // regional blocks, cookie-free). Some tracks — typically Vevo-
  // claimed videos — refuse that host and play only on the classic
  // youtube.com/embed/... URL. Songs opt in with `use_classic_embed`.
  const embedHost = song.use_classic_embed
    ? "www.youtube.com"
    : "www.youtube-nocookie.com";
  const embedSrc =
    `https://${embedHost}/embed/${song.youtube_id}` +
    `?enablejsapi=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=en&playsinline=1` +
    (origin ? `&origin=${encodeURIComponent(origin)}` : "");

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
    <DemoModeContext.Provider value={demoMode}>
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-black">
              {song.youtube_id ? (
                <iframe
                  ref={iframeRef}
                  src={embedSrc}
                  title={`${song.title} — ${song.artist}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-center">
                  <p className="text-sm font-medium text-white">
                    {locale === "pt-BR"
                      ? "Vídeo ainda não vinculado"
                      : "Video not yet linked"}
                  </p>
                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
                  >
                    {locale === "pt-BR" ? "Buscar no YouTube" : "Search on YouTube"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
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
              <p className="text-[11px] text-muted-foreground">
                ⏱{" "}
                {locale === "pt-BR"
                  ? "Os tempos podem não estar sincronizados — edite em Personalizar, no menu Músicas."
                  : "Timestamps may not be synchronized — edit them via Personalize on the Songs menu."}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                {(() => {
                  // If the curated full_lyrics_url is already a
                  // Letras.mus.br link we don't need a second "Lyrics +
                  // translation · letras.mus.br" row — same host, same
                  // page. Show one link labelled for translations.
                  const curated = song.full_lyrics_url ?? null;
                  const curatedIsLetras =
                    !!curated && /letras\.mus\.br/i.test(curated);
                  if (curatedIsLetras && curated) {
                    return (
                      <a
                        href={curated}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        {locale === "pt-BR"
                          ? "Letra + tradução"
                          : "Lyrics + translation"}{" "}
                        · letras.mus.br
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    );
                  }
                  return (
                    <>
                      {curated ? (
                        <a
                          href={curated}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                        >
                          {locale === "pt-BR" ? "Letra completa" : "Full lyrics"}
                          {" · "}
                          {hostname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      <a
                        href={letrasUrl(song.artist, song.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        {locale === "pt-BR"
                          ? "Letra + tradução"
                          : "Lyrics + translation"}{" "}
                        · letras.mus.br
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {singAlongPrompts.length > 0 ? (
          <SingAlongCard
            prompts={singAlongPrompts}
            vocabHint={song.vocab_hooks.slice(0, 3)}
            onSeek={seekTo}
          />
        ) : null}
      </div>

      {song.exercises.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            {locale === "pt-BR" ? "Exercícios" : "Exercises"}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {song.exercises.map((ex, i) => (
              <ExerciseCard
                key={i}
                exercise={ex}
                index={i}
                lessonSlug={lessonSlug}
                response={responses[i] ?? null}
                onResponse={upsertLocal}
                onSeek={seekTo}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
    </DemoModeContext.Provider>
  );
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SingAlongCard({
  prompts,
  vocabHint,
  onSeek,
}: {
  prompts: SingAlongPrompt[];
  vocabHint: { term: string; pt: string; note: string }[];
  onSeek: (seconds: number) => void;
}) {
  const { locale } = useI18n();
  // Fetch DeepL translations for any vocab whose author-supplied pt is empty.
  const termsNeedingTranslation = vocabHint
    .filter((v) => !v.pt || v.pt.length === 0)
    .map((v) => v.term);
  const translations = useVocabTranslations(termsNeedingTranslation);
  const usingMyMemory = termsNeedingTranslation.length > 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        🎤 {locale === "pt-BR" ? "Cante junto" : "Sing along"}
      </p>
      <div className="mt-3 space-y-2">
        {prompts.map((p, i) => (
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
        <>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            {vocabHint.map((v) => {
              const pt = v.pt && v.pt.length > 0 ? v.pt : translations[v.term];
              return (
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
                  {pt ? (
                    <span className="ml-1 text-muted-foreground">· {pt}</span>
                  ) : null}
                </a>
              );
            })}
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground/70">
            {locale === "pt-BR" ? "Definições: " : "Definitions: "}
            <a
              href="https://dictionary.cambridge.org/dictionary/english-portuguese/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted"
            >
              Cambridge Dictionary
            </a>
            {usingMyMemory ? (
              <>
                {" · "}
                {locale === "pt-BR" ? "Tradução: " : "Translation: "}
                <a
                  href="https://mymemory.translated.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted"
                >
                  MyMemory
                </a>
              </>
            ) : null}
          </p>
        </>
      ) : null}
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  lessonSlug,
  response,
  onResponse,
  onSeek,
}: {
  exercise: MusicExercise;
  index: number;
  lessonSlug: string;
  response: ExerciseResponseRow | null;
  onResponse: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
}) {
  const { locale } = useI18n();

  const prompt = locale === "pt-BR" ? exercise.prompt_pt : exercise.prompt_en;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {locale === "pt-BR" ? "Exercício" : "Exercise"} {index + 1}
      </p>
      <p className="mt-1 text-xs font-medium break-words sm:text-sm">{prompt}</p>
      <div className="mt-4">
        {exercise.type === "listen_and_fill" ? (
          <ListenAndFill
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
            onSeek={onSeek}
          />
        ) : exercise.type === "translate_line" ? (
          <TranslateLine
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
          />
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
        ) : exercise.type === "word_to_meaning" ? (
          <WordToMeaning
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
          />
        ) : exercise.type === "unscramble_line" ? (
          <UnscrambleLine
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
            onSeek={onSeek}
          />
        ) : exercise.type === "cloze_multi_choice" ? (
          <ClozeMultiChoice
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
            onSeek={onSeek}
          />
        ) : exercise.type === "count_word" ? (
          <CountWord
            exercise={exercise}
            lessonSlug={lessonSlug}
            exerciseIndex={index}
            initial={response}
            onSaved={onResponse}
          />
        ) : exercise.type === "line_order" ? (
          <LineOrder
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
}: {
  exercise: Extract<MusicExercise, { type: "listen_and_fill" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
}) {
  const { locale } = useI18n();
  const savedText =
    initial?.answer.type === "listen_and_fill" ? initial.answer.text : null;

  const [value, setValue] = useState(savedText ?? "");
  const [checked, setChecked] = useState<null | "correct" | "wrong">(null);
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();

  useEffect(() => {
    setValue(savedText ?? "");
  }, [savedText]);

  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[.,!?;:"]/g, "");

  function check() {
    if (value.trim() === "") {
      toast.info(
        locale === "pt-BR"
          ? "Digite sua resposta primeiro."
          : "Type your answer first."
      );
      return;
    }
    const isCorrect = normalize(value) === normalize(exercise.answer);
    setChecked(isCorrect ? "correct" : "wrong");
    toast[isCorrect ? "success" : "error"](
      isCorrect
        ? locale === "pt-BR"
          ? "Correto! Resposta enviada."
          : "Correct! Answer saved."
        : locale === "pt-BR"
          ? `Resposta: ${exercise.answer}. Sua tentativa foi registrada.`
          : `Answer: ${exercise.answer}. Your attempt was saved.`
    );
    startTransition(async () => {
      const r = await _safeSubmit({
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

      <div className="flex flex-wrap items-center gap-2 text-xs break-words sm:text-sm">
        <span>{exercise.excerpt_before}</span>
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setChecked(null);
          }}
          placeholder={exercise.blank_hint}
          className="h-8 w-full min-w-0 sm:w-40"
        />
        <span>{exercise.excerpt_after}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={check}
          disabled={pending}
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

    </div>
  );
}

function TranslateLine({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "translate_line" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();

  const savedText =
    initial?.answer.type === "translate_line" ? initial.answer.text : null;
  const [text, setText] = useState(savedText ?? "");
  const [editing, setEditing] = useState(savedText === null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    setText(savedText ?? "");
    setEditing(savedText === null);
  }, [savedText]);

  const hasModel =
    typeof exercise.model_answer_pt === "string" &&
    exercise.model_answer_pt.trim().length > 0;

  function send() {
    if (text.trim().length === 0) {
      toast.info(
        locale === "pt-BR"
          ? "Escreva sua tradução primeiro."
          : "Type your translation first."
      );
      return;
    }
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "translate_line", text: text.trim() },
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.response) {
        onSaved(r.response);
        setEditing(false);
        toast.success(
          locale === "pt-BR" ? "Tradução enviada" : "Translation sent"
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <blockquote className="rounded-md border-l-2 border-primary/60 bg-muted/40 p-3 text-sm italic">
        {exercise.excerpt}
      </blockquote>

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              locale === "pt-BR"
                ? "Sua tradução em português…"
                : "Your Portuguese translation…"
            }
            rows={2}
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={send}
              disabled={pending}
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

      {hasModel ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowModel((v) => !v)}
          >
            {showModel ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                {locale === "pt-BR"
                  ? "Ocultar tradução sugerida"
                  : "Hide model translation"}
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {locale === "pt-BR"
                  ? "Ver tradução sugerida"
                  : "Show model translation"}
              </>
            )}
          </Button>
          {showModel ? (
            <div className="rounded-md border border-dashed border-border bg-card p-3 text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === "pt-BR" ? "Tradução sugerida" : "Model translation"}
              </p>
              {exercise.model_answer_pt}
            </div>
          ) : null}
        </>
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
  const _safeSubmit = useSafeSubmit();

  useEffect(() => {
    setText(savedText ?? "");
    setEditing(savedText === null);
  }, [savedText]);

  function send() {
    if (text.trim().length === 0) return;
    startTransition(async () => {
      const answer: ExerciseAnswer = { type: "discussion", text: text.trim() };
      const r = await _safeSubmit({
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
  const _safeSubmit = useSafeSubmit();

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
    return s.trim().toLowerCase().replace(/[.,!?;:"]/g, "");
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
      const r = await _safeSubmit({
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

// --- Creative exercise types (generated by enrich-music.mjs) ---

function WordToMeaning({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "word_to_meaning" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();
  const ptOptions = exercise.pairs.map((p) => p.pt);
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    if (initial?.answer.type === "word_to_meaning") {
      const m: Record<string, string> = {};
      for (const p of initial.answer.pairs) m[p.en] = p.pt;
      return m;
    }
    return {};
  });
  const [result, setResult] = useState<null | { correct: number; total: number }>(
    null
  );

  function submit() {
    let correct = 0;
    for (const p of exercise.pairs) {
      if (choices[p.en] === p.pt) correct++;
    }
    setResult({ correct, total: exercise.pairs.length });
    const pairs = exercise.pairs.map((p) => ({
      en: p.en,
      pt: choices[p.en] ?? "",
    }));
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "word_to_meaning", pairs },
      });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r && r.response) onSaved(r.response);
    });
    toast[correct === exercise.pairs.length ? "success" : "info"](
      locale === "pt-BR"
        ? `${correct}/${exercise.pairs.length} corretas`
        : `${correct}/${exercise.pairs.length} correct`
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {exercise.pairs.map((p) => {
          const picked = choices[p.en];
          const isCorrect = result !== null && picked === p.pt;
          const isWrong = result !== null && picked && picked !== p.pt;
          return (
            <li key={p.en} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{p.en}</span>
              <span className="text-muted-foreground">→</span>
              <select
                value={picked ?? ""}
                onChange={(e) =>
                  setChoices((prev) => ({ ...prev, [p.en]: e.target.value }))
                }
                className={`h-8 rounded-md border bg-background px-2 text-sm ${
                  isCorrect
                    ? "border-emerald-500/60"
                    : isWrong
                      ? "border-rose-500/60"
                      : "border-border"
                }`}
              >
                <option value="">
                  {locale === "pt-BR" ? "escolha…" : "pick…"}
                </option>
                {ptOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {isWrong ? (
                <span className="text-[11px] text-rose-600">
                  {locale === "pt-BR" ? `é "${p.pt}"` : `is "${p.pt}"`}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Button
        size="sm"
        onClick={submit}
        disabled={pending}
        className="gap-1.5"
      >
        <Send className="h-3.5 w-3.5" />
        {locale === "pt-BR" ? "Verificar" : "Check"}
      </Button>
      {initial && !result ? (
        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {locale === "pt-BR"
            ? `Enviado em ${formatWhen(initial.updated_at, locale)}`
            : `Sent on ${formatWhen(initial.updated_at, locale)}`}
        </span>
      ) : null}
    </div>
  );
}

function UnscrambleLine({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
  onSeek,
}: {
  exercise: Extract<MusicExercise, { type: "unscramble_line" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();
  const [picked, setPicked] = useState<string[]>(() => {
    if (initial?.answer.type === "unscramble_line") return initial.answer.order;
    return [];
  });
  const remaining = exercise.shuffled.filter(
    (w, i) =>
      picked.filter((p) => p === w).length <
      exercise.shuffled.filter((s) => s === w).length
  );
  const [result, setResult] = useState<null | "correct" | "wrong">(null);

  function addWord(w: string) {
    setPicked((prev) => [...prev, w]);
    setResult(null);
  }
  function reset() {
    setPicked([]);
    setResult(null);
  }
  function submit() {
    const ok =
      picked.length === exercise.answer.length &&
      picked.every((w, i) => w === exercise.answer[i]);
    setResult(ok ? "correct" : "wrong");
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "unscramble_line", order: picked },
      });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r && r.response) onSaved(r.response);
    });
    toast[ok ? "success" : "error"](
      ok
        ? locale === "pt-BR"
          ? "Correto!"
          : "Correct!"
        : locale === "pt-BR"
          ? "Tente de novo"
          : "Try again"
    );
  }

  return (
    <div className="space-y-3">
      {exercise.youtube_start != null ? (
        <button
          type="button"
          onClick={() => onSeek(exercise.youtube_start!)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          {locale === "pt-BR"
            ? `Ouvir em ${fmt(exercise.youtube_start!)}`
            : `Listen at ${fmt(exercise.youtube_start!)}`}
        </button>
      ) : null}
      <div className="min-h-[36px] rounded-md border border-dashed border-border bg-muted/30 p-2 text-sm">
        {picked.length === 0 ? (
          <span className="text-muted-foreground italic">
            {locale === "pt-BR"
              ? "Clique nas palavras abaixo na ordem correta…"
              : "Click the words below in the correct order…"}
          </span>
        ) : (
          picked.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="mr-1 inline-block rounded-md bg-primary/10 px-2 py-0.5"
            >
              {w}
            </span>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {remaining.map((w, i) => (
          <button
            key={`${w}-r-${i}`}
            type="button"
            onClick={() => addWord(w)}
            className="rounded-md border border-border bg-background px-2 py-0.5 text-sm hover:bg-muted"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={submit}
          disabled={pending || picked.length === 0}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {locale === "pt-BR" ? "Verificar" : "Check"}
        </Button>
        <Button size="sm" variant="outline" onClick={reset} disabled={pending}>
          {locale === "pt-BR" ? "Limpar" : "Reset"}
        </Button>
        {result === "correct" ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {locale === "pt-BR" ? "Correto!" : "Correct!"}
          </span>
        ) : result === "wrong" ? (
          <span className="text-xs text-rose-600">
            {locale === "pt-BR"
              ? `Resposta: ${exercise.answer.join(" ")}`
              : `Answer: ${exercise.answer.join(" ")}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ClozeMultiChoice({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
  onSeek,
}: {
  exercise: Extract<MusicExercise, { type: "cloze_multi_choice" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
  onSeek: (seconds: number) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();
  const savedIdx =
    initial?.answer.type === "cloze_multi_choice"
      ? initial.answer.selected_index
      : null;
  const [selected, setSelected] = useState<number | null>(savedIdx);
  const [result, setResult] = useState<null | "correct" | "wrong">(null);

  function submit() {
    if (selected === null) {
      toast.info(
        locale === "pt-BR" ? "Escolha uma opção primeiro." : "Pick an option first."
      );
      return;
    }
    const ok = selected === exercise.answer_index;
    setResult(ok ? "correct" : "wrong");
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "cloze_multi_choice", selected_index: selected },
      });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r && r.response) onSaved(r.response);
    });
    toast[ok ? "success" : "error"](
      ok
        ? locale === "pt-BR"
          ? "Correto!"
          : "Correct!"
        : locale === "pt-BR"
          ? `Resposta: ${exercise.options[exercise.answer_index]}`
          : `Answer: ${exercise.options[exercise.answer_index]}`
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSeek(exercise.youtube_start)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        {locale === "pt-BR"
          ? `Tocar ${fmt(exercise.youtube_start)} – ${fmt(exercise.youtube_end)}`
          : `Play ${fmt(exercise.youtube_start)} – ${fmt(exercise.youtube_end)}`}
      </button>
      <p className="text-sm">
        <span>{exercise.excerpt_before} </span>
        <span className="inline-block min-w-[80px] rounded bg-muted px-2 py-0.5 text-center italic">
          ?
        </span>
        <span> {exercise.excerpt_after}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {exercise.options.map((opt, i) => {
          const isCorrect = result === "correct" && i === selected;
          const isWrong = result === "wrong" && i === selected;
          const isRightAfterSubmit =
            result !== null && i === exercise.answer_index;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setSelected(i);
                setResult(null);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                selected === i
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50"
              } ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : ""
              } ${isWrong ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : ""} ${
                isRightAfterSubmit && !isCorrect
                  ? "border-emerald-500/60 ring-1 ring-emerald-500/40"
                  : ""
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <Button size="sm" onClick={submit} disabled={pending} className="gap-1.5">
        <Send className="h-3.5 w-3.5" />
        {locale === "pt-BR" ? "Verificar" : "Check"}
      </Button>
    </div>
  );
}

function CountWord({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "count_word" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();
  const savedCount =
    initial?.answer.type === "count_word" ? initial.answer.count : null;
  const [value, setValue] = useState<string>(
    savedCount !== null ? String(savedCount) : ""
  );
  const [result, setResult] = useState<null | "correct" | "wrong">(null);

  function submit() {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) {
      toast.info(
        locale === "pt-BR" ? "Digite um número." : "Enter a number."
      );
      return;
    }
    const ok = n === exercise.answer;
    setResult(ok ? "correct" : "wrong");
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "count_word", count: n },
      });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r && r.response) onSaved(r.response);
    });
    toast[ok ? "success" : "error"](
      ok
        ? locale === "pt-BR"
          ? "Correto!"
          : "Correct!"
        : locale === "pt-BR"
          ? `Era ${exercise.answer}`
          : `It was ${exercise.answer}`
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">"{exercise.word}"</span>
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
          placeholder={locale === "pt-BR" ? "quantas vezes?" : "how many?"}
          className={`h-8 w-28 ${
            result === "correct"
              ? "border-emerald-500/60"
              : result === "wrong"
                ? "border-rose-500/60"
                : ""
          }`}
        />
        <Button size="sm" onClick={submit} disabled={pending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {locale === "pt-BR" ? "Verificar" : "Check"}
        </Button>
      </div>
    </div>
  );
}

function LineOrder({
  exercise,
  lessonSlug,
  exerciseIndex,
  initial,
  onSaved,
}: {
  exercise: Extract<MusicExercise, { type: "line_order" }>;
  lessonSlug: string;
  exerciseIndex: number;
  initial: ExerciseResponseRow | null;
  onSaved: (r: ExerciseResponseRow) => void;
}) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const _safeSubmit = useSafeSubmit();
  // We present excerpts shuffled by the natural-text order (not the chronological)
  // so the student actually has to figure out the time order.
  const shuffled = [...exercise.excerpts].sort((a, b) =>
    a.text.localeCompare(b.text)
  );
  const savedOrder =
    initial?.answer.type === "line_order" ? initial.answer.order : null;

  const [ranks, setRanks] = useState<Record<number, number | null>>(() => {
    if (savedOrder && savedOrder.length === shuffled.length) {
      const m: Record<number, number | null> = {};
      for (let i = 0; i < shuffled.length; i++) m[shuffled[i].order] = savedOrder[i];
      return m;
    }
    const m: Record<number, number | null> = {};
    for (const s of shuffled) m[s.order] = null;
    return m;
  });
  const [result, setResult] = useState<null | { correct: number; total: number }>(
    null
  );

  function submit() {
    let correct = 0;
    for (const s of shuffled) {
      if (ranks[s.order] === s.order + 1) correct++;
    }
    setResult({ correct, total: shuffled.length });
    const order = shuffled.map((s) => ranks[s.order] ?? 0);
    startTransition(async () => {
      const r = await _safeSubmit({
        lessonSlug,
        exerciseIndex,
        answer: { type: "line_order", order },
      });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r && r.response) onSaved(r.response);
    });
    toast[correct === shuffled.length ? "success" : "info"](
      locale === "pt-BR"
        ? `${correct}/${shuffled.length} na posição certa`
        : `${correct}/${shuffled.length} in the right position`
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {shuffled.map((s) => {
          const picked = ranks[s.order];
          const isCorrect = result !== null && picked === s.order + 1;
          const isWrong = result !== null && picked !== null && !isCorrect;
          return (
            <li
              key={s.order}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2 text-sm"
            >
              <select
                value={picked ?? ""}
                onChange={(e) =>
                  setRanks((prev) => ({
                    ...prev,
                    [s.order]: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                className={`h-8 w-14 rounded-md border bg-background px-1 text-center ${
                  isCorrect
                    ? "border-emerald-500/60"
                    : isWrong
                      ? "border-rose-500/60"
                      : "border-border"
                }`}
              >
                <option value=""></option>
                {shuffled.map((_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <span className="italic">{s.text}</span>
            </li>
          );
        })}
      </ul>
      <Button size="sm" onClick={submit} disabled={pending} className="gap-1.5">
        <Send className="h-3.5 w-3.5" />
        {locale === "pt-BR" ? "Verificar" : "Check"}
      </Button>
    </div>
  );
}
