"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PenTool, Loader2, Upload, Trash2 } from "lucide-react";
import {
  removeSignature,
  setSignatureEnabled,
  uploadSignature,
} from "@/lib/actions/signature";

interface Props {
  initialEnabled: boolean;
  /** Short-lived signed URL passed from the server at page load.
      When null the teacher hasn't uploaded anything yet. */
  initialSignedUrl: string | null;
  teacherName: string;
}

export function SignatureUploader({
  initialEnabled,
  initialSignedUrl,
  teacherName,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setSignatureEnabled(next);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setEnabled(!next);
        return;
      }
      toast.success(
        next
          ? "Assinatura ativada nos documentos"
          : "Assinatura desativada — documentos mostram só o nome",
      );
    });
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await uploadSignature(formData);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Assinatura enviada");
      // Hard reload so a fresh signed URL comes back from the server.
      window.location.reload();
    });
  }

  function remove() {
    if (
      !confirm(
        "Remover a imagem da assinatura? Os documentos voltarão a mostrar apenas o nome.",
      )
    )
      return;
    startTransition(async () => {
      const res = await removeSignature();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setSignedUrl(null);
      setEnabled(false);
      toast.success("Assinatura removida");
      window.location.reload();
    });
  }

  const hasSignature = !!signedUrl;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Envie uma foto da sua assinatura (fundo claro, caneta preta) — ela
        aparece nos recibos e pode ser ativada também no relatório de
        currículo do aluno. Quando estiver desativada, os documentos saem
        apenas com o seu nome impresso.
      </p>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/60 p-3">
        <div className="flex h-20 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
          {hasSignature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl!}
              alt={`Assinatura de ${teacherName}`}
              className={`max-h-16 w-auto object-contain transition-opacity ${
                enabled ? "opacity-100" : "opacity-30"
              }`}
            />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sem assinatura
            </span>
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-sm font-semibold">
            {!hasSignature
              ? "Envie sua assinatura"
              : enabled
                ? "Aparecendo nos documentos"
                : "Imagem enviada · desativada"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPG ou WebP · até 4 MB · recorte automático do fundo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={pickFile}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {hasSignature ? "Substituir" : "Enviar"}
          </button>
          {hasSignature ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
              title="Remover a assinatura"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            disabled={pending || !hasSignature}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${
              enabled && hasSignature
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                : "border-border bg-background text-foreground hover:bg-muted disabled:opacity-50"
            }`}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PenTool className="h-3.5 w-3.5" />
            )}
            {enabled ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    </div>
  );
}
