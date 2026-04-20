"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { setReceiptsVisibleToStudent } from "@/lib/actions/reports";

interface Props {
  rosterId: string;
  initialVisible: boolean;
}

/**
 * Master switch: when flipped on, the per-receipt share toggles on
 * each paid row become interactive. Off by default so nothing leaks.
 */
export function ReceiptsVisibilityToggle({ rosterId, initialVisible }: Props) {
  const { locale } = useI18n();
  const [visible, setVisible] = useState(initialVisible);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    setVisible(next);
    startTransition(async () => {
      const res = await setReceiptsVisibleToStudent(rosterId, next);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setVisible(!next);
        return;
      }
      toast.success(
        next
          ? locale === "pt-BR"
            ? "Liberação ativada — marque cada recibo abaixo"
            : "Unlocked — now share each receipt below"
          : locale === "pt-BR"
            ? "Recibos ocultos para o aluno"
            : "Receipts hidden from student",
      );
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold">
          {locale === "pt-BR"
            ? "Liberar recibos para o aluno"
            : "Let the student see receipts"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {locale === "pt-BR"
            ? "Com isto ativo, use o botão Enviar em cada recibo abaixo para escolher quais aparecem no perfil do aluno."
            : "Once on, use the Share button on each receipt below to pick the ones the student will see in their profile."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors ${
          visible
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
            : "border-border bg-background text-foreground hover:bg-muted"
        } disabled:opacity-50`}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : visible ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
        {visible
          ? locale === "pt-BR"
            ? "Liberado"
            : "Unlocked"
          : locale === "pt-BR"
            ? "Bloqueado"
            : "Locked"}
      </button>
    </div>
  );
}
