"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { deleteServiceReceipt } from "@/lib/actions/service-receipts";

export function DeleteServiceReceiptButton({ id }: { id: string }) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    const ok = confirm(
      locale === "pt-BR"
        ? "Remover este recibo de serviço? Essa ação não pode ser desfeita."
        : "Delete this service receipt? This cannot be undone.",
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteServiceReceipt(id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        locale === "pt-BR" ? "Recibo removido" : "Receipt deleted",
      );
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      title={
        locale === "pt-BR" ? "Remover recibo" : "Delete receipt"
      }
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
    </button>
  );
}
