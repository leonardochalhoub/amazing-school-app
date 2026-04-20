"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { setReceiptSharedWithStudent } from "@/lib/actions/reports";

interface Props {
  paymentId: string;
  initialShared: boolean;
  /** Disabled when the master switch is off — the UI still renders
      so teachers see the control exists, but flipping is blocked. */
  masterSwitchOn: boolean;
}

export function ShareReceiptToggle({
  paymentId,
  initialShared,
  masterSwitchOn,
}: Props) {
  const { locale } = useI18n();
  const [shared, setShared] = useState(initialShared);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!masterSwitchOn) {
      toast.error(
        locale === "pt-BR"
          ? "Ative a liberação geral de recibos primeiro."
          : "Enable the master receipts toggle first.",
      );
      return;
    }
    const next = !shared;
    setShared(next);
    startTransition(async () => {
      const res = await setReceiptSharedWithStudent(paymentId, next);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setShared(!next);
        return;
      }
      toast.success(
        next
          ? locale === "pt-BR"
            ? "Recibo enviado ao aluno"
            : "Receipt shared with student"
          : locale === "pt-BR"
            ? "Recibo ocultado do aluno"
            : "Receipt hidden from student",
      );
    });
  }

  const label = shared
    ? locale === "pt-BR"
      ? "Enviado"
      : "Shared"
    : locale === "pt-BR"
      ? "Enviar"
      : "Share";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !masterSwitchOn}
      title={
        masterSwitchOn
          ? undefined
          : locale === "pt-BR"
            ? "Ative a liberação geral primeiro"
            : "Turn on the master switch first"
      }
      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium transition-colors ${
        shared
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      } disabled:opacity-50`}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : shared ? (
        <Check className="h-3 w-3" />
      ) : null}
      {label}
    </button>
  );
}
