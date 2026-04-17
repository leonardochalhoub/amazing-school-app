"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markLessonComplete } from "@/lib/actions/lesson-completion";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  lessonSlug: string;
  xpReward?: number;
  initiallyCompleted: boolean;
  demoMode?: boolean;
}

export function MarkCompleteButton({
  lessonSlug,
  xpReward = 25,
  initiallyCompleted,
  demoMode = false,
}: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(initiallyCompleted);

  function mark() {
    if (demoMode) {
      toast.info(
        locale === "pt-BR"
          ? "Modo demo — entre para salvar seu progresso."
          : "Demo mode — sign up to save your progress."
      );
      return;
    }
    startTransition(async () => {
      const r = await markLessonComplete({ lessonSlug, xpReward });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r) {
        setDone(true);
        if (r.alreadyCompleted) {
          toast.info(
            locale === "pt-BR"
              ? "Já marcada como concluída."
              : "Already marked complete."
          );
        } else {
          toast.success(
            locale === "pt-BR"
              ? `Concluído! +${r.awardedXp} XP`
              : `Completed! +${r.awardedXp} XP`,
            { icon: "🎉" }
          );
        }
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-pink-500/10 p-5 text-center">
      <p className="text-sm font-medium">
        {done
          ? locale === "pt-BR"
            ? "Você concluiu esta lição 🎉"
            : "You've completed this lesson 🎉"
          : locale === "pt-BR"
            ? "Finalizou? Marque como concluída para ganhar XP."
            : "All done? Mark this complete to earn XP."}
      </p>
      <Button
        size="lg"
        onClick={mark}
        disabled={pending || done}
        className="gap-2"
      >
        {done ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            {locale === "pt-BR" ? "Concluída" : "Completed"}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {pending
              ? locale === "pt-BR"
                ? "Salvando…"
                : "Saving…"
              : locale === "pt-BR"
                ? `Marcar como concluída (+${xpReward} XP)`
                : `Mark as complete (+${xpReward} XP)`}
          </>
        )}
      </Button>
    </div>
  );
}
