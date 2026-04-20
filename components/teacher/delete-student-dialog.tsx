"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteRosterStudent } from "@/lib/actions/roster";

interface Props {
  rosterId: string;
  fullName: string;
  label: string;
  pt: boolean;
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Destructive roster action dialog. Collects the student's last
 * billable month before calling deleteRosterStudent — that month's
 * last day gets written to ended_on so the tuition matrix:
 *   - keeps the student visible in that month (past cells still
 *     editable for settling payments)
 *   - locks every month after it (red squares)
 *   - hides the row from year views entirely past the ended_on
 * On reactivate later (Management → Deleted students) the teacher
 * picks a "return month" that reopens billing from there.
 */
export function DeleteStudentDialog({ rosterId, fullName, label, pt }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lastMonth, setLastMonth] = useState(currentYm);
  const [pending, startTransition] = useTransition();

  const copy = pt
    ? {
        title: `Remover ${fullName}?`,
        intro:
          "O histórico de pagamentos, lições e notas continua registrado. O mês escolhido abaixo é o último mês em que pagamentos podem ser lançados para esse aluno.",
        lastMonth: "Último mês de pagamento",
        restoreNote:
          "Se ele voltar depois, você pode reativar em Gestão → Alunos removidos.",
        cancel: "Cancelar",
        confirm: "Remover aluno",
        deleted: `${fullName} removido.`,
      }
    : {
        title: `Remove ${fullName}?`,
        intro:
          "Their history (payments, lessons, notes, chats) stays intact. The month you pick below is the last month payments can be recorded for this student.",
        lastMonth: "Last billing month",
        restoreNote:
          "If they come back later, you can restore from Management → Deleted students.",
        cancel: "Cancel",
        confirm: "Remove student",
        deleted: `${fullName} removed.`,
      };

  function submit() {
    startTransition(async () => {
      const endedOn = lastDayOfMonth(lastMonth);
      const res = await deleteRosterStudent({ id: rosterId, endedOn });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(copy.deleted);
      setOpen(false);
      router.push("/teacher");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {label}
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="pt-2">{copy.intro}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="ended-on">{copy.lastMonth}</Label>
          <Input
            id="ended-on"
            type="month"
            value={lastMonth}
            onChange={(e) => setLastMonth(e.target.value)}
            disabled={pending}
          />
        </div>

        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          {copy.restoreNote}
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            {copy.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
