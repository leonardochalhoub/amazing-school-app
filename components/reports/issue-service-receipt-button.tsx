"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus, Loader2, Printer } from "lucide-react";
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
import { useI18n } from "@/lib/i18n/context";
import { createServiceReceipt } from "@/lib/actions/service-receipts";
import { formatCpf } from "@/lib/reports/cpf";

interface StudentOption {
  id: string;
  fullName: string;
}

interface Props {
  students: StudentOption[];
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Ad-hoc service receipt issuer — consultoria, tradução, mentoria,
 * anything that doesn't fit the monthly tuition matrix. Teacher
 * picks an existing roster student (or leaves client name free
 * for an external party), enters a description + amount, hits
 * Emitir, and the print page opens in a new tab auto-printing the
 * PDF.
 */
export function IssueServiceReceiptButton({ students }: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const EXTERNAL = "__external__";
  const [studentId, setStudentId] = useState<string>(
    students[0]?.id ?? EXTERNAL,
  );
  const [clientName, setClientName] = useState<string>(
    students[0]?.fullName ?? "",
  );
  const [clientCpf, setClientCpf] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amountBrl, setAmountBrl] = useState<string>("");
  const [issuedOn, setIssuedOn] = useState<string>(todayISO());
  const [notes, setNotes] = useState<string>("");

  function onPickStudent(id: string) {
    setStudentId(id);
    if (id === EXTERNAL) {
      setClientName("");
    } else {
      const picked = students.find((s) => s.id === id);
      setClientName(picked?.fullName ?? "");
    }
  }

  function submit() {
    const name = clientName.trim();
    if (!name) {
      toast.error(
        locale === "pt-BR"
          ? "Informe o nome do cliente."
          : "Client name is required.",
      );
      return;
    }
    const amtNum = Number(amountBrl.replace(",", "."));
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      toast.error(
        locale === "pt-BR"
          ? "Valor inválido."
          : "Amount must be greater than zero.",
      );
      return;
    }
    const amountCents = Math.round(amtNum * 100);
    if (!description.trim()) {
      toast.error(
        locale === "pt-BR"
          ? "Descreva o serviço prestado."
          : "Service description is required.",
      );
      return;
    }

    startTransition(async () => {
      const res = await createServiceReceipt({
        rosterStudentId: studentId === EXTERNAL ? null : studentId,
        clientName: name,
        clientCpf,
        description: description.trim(),
        amountCents,
        issuedOn,
        notes: notes.trim(),
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        locale === "pt-BR" ? "Recibo emitido" : "Receipt issued",
      );
      setOpen(false);
      router.refresh();
      // Open the printable version in a new tab so the teacher
      // can immediately save the PDF.
      window.open(
        `/print/service-receipt/${res.id}?autoprint=1`,
        "_blank",
        "noopener,noreferrer",
      );
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <FilePlus className="h-3.5 w-3.5" />
        {locale === "pt-BR" ? "Emitir recibo avulso" : "Issue service receipt"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "pt-BR" ? "Emitir recibo avulso" : "Issue service receipt"}
            </DialogTitle>
            <DialogDescription>
              {locale === "pt-BR"
                ? "Use para serviços fora da mensalidade — consultoria, tradução, aula extra, mentoria. O recibo sai com o seu logo e número único."
                : "Use for anything outside the monthly tuition — consulting, translation, extra classes, mentoring. The receipt ships with your logo and a unique number."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="svc-student">
                {locale === "pt-BR" ? "Quem pagou" : "Who paid"}
              </Label>
              <select
                id="svc-student"
                value={studentId}
                onChange={(e) => onPickStudent(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={EXTERNAL}>
                  {locale === "pt-BR"
                    ? "— Externo / outro —"
                    : "— External / other —"}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svc-client">
                {locale === "pt-BR" ? "Nome no recibo" : "Name on the receipt"}
              </Label>
              <Input
                id="svc-client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={
                  locale === "pt-BR"
                    ? "Ex.: Maria Silva ou Empresa ACME Ltda."
                    : "e.g. Maria Silva or ACME Ltd."
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svc-cpf">
                CPF / CNPJ{" "}
                <span className="text-muted-foreground">
                  ({locale === "pt-BR" ? "opcional" : "optional"})
                </span>
              </Label>
              <Input
                id="svc-cpf"
                value={clientCpf}
                onChange={(e) => setClientCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={18}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svc-description">
                {locale === "pt-BR" ? "Serviço prestado" : "Service description"}
              </Label>
              <Textarea
                id="svc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  locale === "pt-BR"
                    ? "Ex.: Tradução de documentos acadêmicos · Consultoria pedagógica · Aulas particulares avulsas"
                    : "e.g. Translation of academic documents · Pedagogical consulting · Private extra lessons"
                }
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="svc-amount">
                  {locale === "pt-BR" ? "Valor (R$)" : "Amount (R$)"}
                </Label>
                <Input
                  id="svc-amount"
                  value={amountBrl}
                  onChange={(e) => setAmountBrl(e.target.value)}
                  placeholder="250,00"
                  inputMode="decimal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="svc-issued">
                  {locale === "pt-BR" ? "Emitido em" : "Issued on"}
                </Label>
                <Input
                  id="svc-issued"
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="svc-notes">
                {locale === "pt-BR" ? "Observações" : "Notes"}{" "}
                <span className="text-muted-foreground">
                  ({locale === "pt-BR" ? "opcional" : "optional"})
                </span>
              </Label>
              <Textarea
                id="svc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  locale === "pt-BR"
                    ? "Qualquer detalhe adicional que deva aparecer no corpo do recibo."
                    : "Any additional detail to append to the receipt body."
                }
                rows={2}
                maxLength={600}
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
              {locale === "pt-BR" ? "Cancelar" : "Cancel"}
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="mr-1.5 h-3.5 w-3.5" />
              )}
              {locale === "pt-BR" ? "Emitir e baixar" : "Issue & download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
