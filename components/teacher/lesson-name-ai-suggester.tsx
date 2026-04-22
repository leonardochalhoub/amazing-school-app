"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";

type Suggestion = {
  title: string;
  slug: string;
  rationale: string;
};

interface Props {
  onApply: (title: string, slug: string) => void;
}

export function LessonNameAiSuggester({ onApply }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [context, setContext] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [pending, startTransition] = useTransition();

  function suggest() {
    const trimmed = context.trim();
    if (trimmed.length < 3) {
      toast.error(
        pt
          ? "Descreva o que você quer ensinar em uma frase."
          : "Describe what you want to teach in one sentence.",
      );
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/lesson-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: trimmed, locale }),
        });
        if (!res.ok) {
          toast.error(pt ? "IA indisponível." : "AI unavailable.");
          return;
        }
        const data = (await res.json()) as Suggestion;
        setSuggestion(data);
      } catch {
        toast.error(pt ? "Falha na sugestão." : "Suggestion failed.");
      }
    });
  }

  function apply() {
    if (!suggestion) return;
    onApply(suggestion.title, suggestion.slug);
    toast.success(pt ? "Título e slug aplicados." : "Title and slug applied.");
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {pt ? "Me diga o que você quer ensinar" : "Tell me what you want to teach"}
        </div>
        <p className="text-xs text-muted-foreground">
          {pt
            ? "Digite uma frase ou dois parágrafos descrevendo a lição — tópico, nível, foco. A IA sugere um título e um slug único."
            : "Write a sentence or two describing the lesson — topic, level, focus. The AI will suggest a title and a unique slug."}
        </p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          disabled={pending}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
          placeholder={
            pt
              ? "Ex: Lição A2 de leitura sobre rotinas matinais. Quero 5 perguntas de múltipla escolha e um exercício de completar lacunas."
              : "e.g. A2 reading lesson on morning routines. I want 5 multiple-choice questions and a fill-in-the-blank."
          }
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={suggest}
            disabled={pending}
            className="gap-1.5"
          >
            <Wand2 className="h-4 w-4" />
            {pending
              ? pt
                ? "Pensando…"
                : "Thinking…"
              : pt
                ? "Sugerir nome e slug"
                : "Suggest name and slug"}
          </Button>
          {suggestion ? (
            <Button size="sm" variant="outline" onClick={suggest} disabled={pending}>
              {pt ? "Outra sugestão" : "Try again"}
            </Button>
          ) : null}
        </div>
        {suggestion ? (
          <div className="rounded-md border border-border bg-background p-3 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {pt ? "Sugestão" : "Suggestion"}
            </p>
            <p className="mt-1 text-sm font-semibold">{suggestion.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              /{suggestion.slug}
            </p>
            <p className="mt-1 italic text-muted-foreground">
              {suggestion.rationale}
            </p>
            <div className="mt-2">
              <Button size="sm" onClick={apply} className="h-7 text-[11px]">
                {pt ? "Aplicar título + slug" : "Apply title + slug"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
