"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCertificate } from "@/lib/actions/certificates";

export function DeleteCertificateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function remove() {
    if (
      !confirm(
        "Remover este certificado? O aluno perde o acesso imediatamente.",
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCertificate(id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Certificado removido");
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      title="Remover certificado"
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
