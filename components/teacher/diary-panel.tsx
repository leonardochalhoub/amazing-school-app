"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Smile,
  Meh,
  Frown,
  PartyPopper,
  Cloud,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  type DiaryEntry,
} from "@/lib/actions/diary";

interface Props {
  rosterStudentId: string;
  entries: DiaryEntry[];
}

type Mood = NonNullable<DiaryEntry["mood"]>;

const MOOD_OPTIONS: { value: Mood; icon: typeof Smile; color: string }[] = [
  { value: "great", icon: PartyPopper, color: "text-fuchsia-500" },
  { value: "good", icon: Smile, color: "text-emerald-500" },
  { value: "ok", icon: Meh, color: "text-amber-500" },
  { value: "tough", icon: Cloud, color: "text-sky-500" },
  { value: "rough", icon: Frown, color: "text-rose-500" },
];

const STRINGS = {
  en: {
    heading: "Diary log",
    hint: "Personal notes about lessons, mood, and progress. Only you see these.",
    bodyPlaceholder: "How did today's class go? What should you remember?",
    moodLabel: "Today's mood",
    moodNone: "No mood",
    moodLabels: {
      great: "Great",
      good: "Good",
      ok: "OK",
      tough: "Tough",
      rough: "Rough",
    } as Record<Mood, string>,
    save: "Save entry",
    saving: "Saving…",
    empty: "No diary entries yet — add your first one.",
    delete: "Delete",
    confirmDelete: "Delete this diary entry?",
    added: "Diary entry saved",
    deleted: "Entry deleted",
  },
  "pt-BR": {
    heading: "Diário",
    hint: "Anotações pessoais sobre aulas, humor e progresso. Só você vê.",
    bodyPlaceholder: "Como foi a aula de hoje? O que você quer lembrar?",
    moodLabel: "Humor de hoje",
    moodNone: "Sem humor",
    moodLabels: {
      great: "Ótimo",
      good: "Bom",
      ok: "Razoável",
      tough: "Difícil",
      rough: "Ruim",
    } as Record<Mood, string>,
    save: "Salvar entrada",
    saving: "Salvando…",
    empty: "Sem anotações ainda — escreva a primeira.",
    delete: "Apagar",
    confirmDelete: "Apagar esta entrada?",
    added: "Entrada salva",
    deleted: "Entrada apagada",
  },
} as const;

export function DiaryPanel({ rosterStudentId, entries }: Props) {
  const { locale } = useI18n();
  const t = locale === "pt-BR" ? STRINGS["pt-BR"] : STRINGS.en;

  const [body, setBody] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [local, setLocal] = useState<DiaryEntry[]>(entries);
  const [pending, startTransition] = useTransition();

  function save() {
    if (body.trim().length === 0) return;
    startTransition(async () => {
      const result = await createDiaryEntry({
        rosterStudentId,
        body: body.trim(),
        mood: mood ?? null,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.added);
        setBody("");
        setMood(null);
        // Optimistically prepend — server will refresh on next load.
        const optimistic: DiaryEntry = {
          id: crypto.randomUUID(),
          roster_student_id: rosterStudentId,
          teacher_id: "",
          body: body.trim(),
          mood,
          entry_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLocal((prev) => [optimistic, ...prev]);
      }
    });
  }

  function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    startTransition(async () => {
      const result = await deleteDiaryEntry({ id });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.deleted);
        setLocal((prev) => prev.filter((e) => e.id !== id));
      }
    });
  }

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
          <BookOpen className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{t.heading}</h2>
          <p className="text-[11px] text-muted-foreground">{t.hint}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.bodyPlaceholder}
          maxLength={8000}
          className="min-h-[90px] w-full resize-y rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.moodLabel}
          </span>
          <button
            type="button"
            onClick={() => setMood(null)}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
              mood === null
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            {t.moodNone}
          </button>
          {MOOD_OPTIONS.map(({ value, icon: Icon, color }) => {
            const active = mood === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMood(value)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                <Icon className={`h-3 w-3 ${active ? "text-background" : color}`} />
                {t.moodLabels[value]}
              </button>
            );
          })}
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={save}
              disabled={pending || body.trim().length === 0}
            >
              {pending ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </div>

      {local.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ol className="space-y-3">
          {local.map((entry) => {
            const moodItem = entry.mood
              ? MOOD_OPTIONS.find((m) => m.value === entry.mood)
              : null;
            const Icon = moodItem?.icon;
            return (
              <li
                key={entry.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      {Icon ? (
                        <Icon className={`h-4 w-4 ${moodItem?.color ?? ""}`} />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">
                        {dateFormatter.format(new Date(entry.entry_date))}
                      </p>
                      {entry.mood ? (
                        <p className="text-[11px] text-muted-foreground">
                          {t.moodLabels[entry.mood]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(entry.id)}
                    disabled={pending}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {entry.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
