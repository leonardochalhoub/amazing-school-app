"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareLessonToBank } from "@/lib/actions/lesson-bank";
import type { TeacherLessonRow } from "@/lib/actions/teacher-lessons-types";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  lesson: TeacherLessonRow;
}

export function ShareToBankButton({ lesson }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await shareLessonToBank({
        teacher_lesson_id: lesson.id,
        change_note: note.trim() || undefined,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? "Lição publicada no banco! Agora todos os professores podem vê-la."
          : "Lesson shared to the bank! Every teacher can see it now.",
      );
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Share2 className="h-4 w-4" />
        {pt ? "Compartilhar no banco" : "Share to bank"}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">
              {pt ? "Compartilhar no banco de lições" : "Share to lesson bank"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {pt
                ? "Esta lição aparecerá no banco público para todos os professores. Você continua sendo o único que pode editar ou excluir — a cada atualização, uma nova versão é registrada."
                : "This lesson will appear in the public bank for every teacher. You remain the only one who can edit or delete — each update records a new version."}
            </p>
            <div className="mt-3 space-y-1.5">
              <label className="text-xs font-medium">
                {pt ? "O que mudou? (opcional)" : "What changed? (optional)"}
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                placeholder={
                  pt ? "Correção do exercício 3; adicionei hints." : "Fixed exercise 3; added hints."
                }
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                {pt ? "Cancelar" : "Cancel"}
              </Button>
              <Button size="sm" onClick={submit} disabled={pending} className="gap-1.5">
                <Check className="h-4 w-4" />
                {pending ? (pt ? "Publicando…" : "Publishing…") : pt ? "Publicar" : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
