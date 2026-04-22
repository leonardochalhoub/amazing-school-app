"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareMusicOverrideToBank } from "@/lib/actions/lesson-bank";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  musicSlug: string;
  songTitle: string;
  songCefr?: string | null;
  songDescription?: string | null;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * Mirror of ShareToBankButton for music overrides. Opens a small modal,
 * collects an optional change-note, and pushes the current override
 * snapshot into the bank as a music-kind entry.
 */
export function ShareMusicToBankButton({
  musicSlug,
  songTitle,
  songCefr,
  songDescription,
  disabled,
  disabledReason,
}: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await shareMusicOverrideToBank({
        music_slug: musicSlug,
        song_meta: {
          title: songTitle,
          cefr_level: songCefr ?? null,
          description: songDescription ?? null,
        },
        change_note: note.trim() || undefined,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? "Música publicada no banco! Outros professores podem trazê-la."
          : "Music shared to the bank! Other teachers can pull it in.",
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
        onClick={() => {
          if (disabled) {
            toast.info(disabledReason ?? "Save your changes first.");
            return;
          }
          setOpen(true);
        }}
        className="gap-1.5"
      >
        <Share2 className="h-4 w-4" />
        {pt ? "Compartilhar no banco" : "Share to bank"}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">
              {pt ? "Compartilhar música no banco" : "Share music to bank"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {pt
                ? `Compartilha sua versão personalizada de "${songTitle}" — timings, letra e exercícios. Você continua sendo o único que pode editar, e cada atualização gera uma nova versão. Algumas músicas têm timing perfeito, outras não — revise antes de publicar.`
                : `Shares your personalized version of "${songTitle}" — timings, lyrics, and exercises. You remain the only editor, and every update records a new version. Some songs have perfect timing, others don't — double-check before publishing.`}
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
                  pt
                    ? "Timings do refrão corrigidos; letra do 2º verso refeita."
                    : "Chorus timings fixed; 2nd-verse lyrics redone."
                }
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                {pt ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={pending}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                {pending
                  ? pt
                    ? "Publicando…"
                    : "Publishing…"
                  : pt
                    ? "Publicar"
                    : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
