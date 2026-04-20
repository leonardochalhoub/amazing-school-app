"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { setReceiptSharedWithStudent } from "@/lib/actions/reports";

interface Props {
  paymentId: string;
  initialShared: boolean;
  /** Kept on the API for the moment but no longer gates toggling
      — the teacher can flip "Enviar" freely and the master switch
      only decides whether the student's profile surface lists
      receipts at all. */
  masterSwitchOn?: boolean;
}

export function ShareReceiptToggle({
  paymentId,
  initialShared,
}: Props) {
  const { locale } = useI18n();
  const [shared, setShared] = useState(initialShared);
  const [pending, startTransition] = useTransition();

  function toggle() {
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
            ? "Recibo marcado como enviado"
            : "Receipt marked as shared"
          : locale === "pt-BR"
            ? "Recibo desmarcado"
            : "Receipt unmarked",
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
      disabled={pending}
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
