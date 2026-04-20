"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCertificate } from "@/lib/actions/certificates";
import {
  CERTIFICATE_LEVELS,
  GRADE_OPTIONS,
} from "@/lib/reports/certificate-levels";

interface Props {
  rosterStudentId: string;
  studentName: string;
  defaultStartOn: string | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function IssueCertificateButton({
  rosterStudentId,
  studentName,
  defaultStartOn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [level, setLevel] = useState<string>("b1_1");
  const [grade, setGrade] = useState<string>("A");
  const [startOn, setStartOn] = useState<string>(
    defaultStartOn?.slice(0, 10) ?? todayISO(),
  );
  const [endOn, setEndOn] = useState<string>(todayISO());
  const [title, setTitle] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  function submit() {
    startTransition(async () => {
      const res = await createCertificate({
        rosterStudentId,
        level,
        grade,
        courseStartOn: startOn,
        courseEndOn: endOn,
        title,
        remarks,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Certificado emitido");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Emitir certificado
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir certificado</DialogTitle>
            <DialogDescription>
              Para <span className="font-medium">{studentName}</span>. O
              certificado fica disponível no perfil do aluno para download.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* CEFR context so teachers know what scale they're awarding on. */}
            <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-2.5 text-[11px] text-sky-800 dark:text-sky-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Curso alinhado ao{" "}
                <span className="font-semibold">
                  Common European Framework of Reference for Languages
                  (CEFR)
                </span>{" "}
                — A1 a C2, adotado por Cambridge, Cultura Inglesa e demais
                escolas de referência.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certificate-level">Nível concluído</Label>
              <select
                id="certificate-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CERTIFICATE_LEVELS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.codeLabel} · {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Conceito</Label>
              <div className="grid grid-cols-3 gap-2">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGrade(g.value)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      grade === g.value
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="block font-bold">{g.value}</span>
                    <span className="block text-[11px]">{g.caption}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="certificate-start">Início do curso</Label>
                <Input
                  id="certificate-start"
                  type="date"
                  value={startOn}
                  onChange={(e) => setStartOn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="certificate-end">Conclusão</Label>
                <Input
                  id="certificate-end"
                  type="date"
                  value={endOn}
                  onChange={(e) => setEndOn(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certificate-title">
                Título personalizado{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="certificate-title"
                placeholder="Ex.: Certificado de Conclusão · Intermediário B1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certificate-remarks">
                Observações{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="certificate-remarks"
                placeholder="Frase de destaque do professor — aparece no rodapé do certificado."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Emitir certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
