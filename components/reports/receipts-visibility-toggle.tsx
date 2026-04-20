"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setReceiptsVisibleToStudent } from "@/lib/actions/reports";

interface Props {
  rosterId: string;
  initialVisible: boolean;
}

/**
 * Compact opt-in toggle the teacher flips on a per-student basis to
 * let that student download their own paid-month receipts from the
 * student profile page.
 */
export function ReceiptsVisibilityToggle({ rosterId, initialVisible }: Props) {
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
          ? "Aluno já pode baixar os próprios recibos"
          : "Recibos ocultos para o aluno",
      );
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold">Liberar recibos para o aluno</p>
        <p className="text-[11px] text-muted-foreground">
          Quando ativo, o aluno vê os próprios recibos em{" "}
          <span className="font-medium">Perfil</span> e pode baixá-los em PDF.
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
        {visible ? "Liberado" : "Bloqueado"}
      </button>
    </div>
  );
}
