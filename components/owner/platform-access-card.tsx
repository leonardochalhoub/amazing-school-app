"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Shield, UserPlus, UserMinus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  grantOwnerByEmail,
  revokeOwnerRole,
  type AuditRow,
  type OwnerRow,
} from "@/lib/actions/owner-grants";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  currentOwners: OwnerRow[];
  audit: AuditRow[];
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function PlatformAccessCard({ currentOwners, audit }: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function grant() {
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await grantOwnerByEmail({
        email: trimmed,
        reason: reason.trim() || undefined,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        pt
          ? `${trimmed} agora é proprietário(a)`
          : `${trimmed} is now an owner`,
      );
      setEmail("");
      setReason("");
      router.refresh();
    });
  }

  function revoke(subjectId: string, subjectName: string) {
    if (
      !confirm(
        pt
          ? `Revogar o acesso de proprietário de ${subjectName}? A conta volta a ser apenas professor. O último proprietário não pode ser revogado.`
          : `Revoke owner access from ${subjectName}? They'll drop to teacher role. The last remaining owner can't be revoked.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await revokeOwnerRole({ subjectId });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        pt ? `${subjectName} rebaixado(a)` : `${subjectName} demoted`,
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {pt ? "Acesso à plataforma" : "Platform access"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {pt
                ? "Todos listados aqui têm acesso de proprietário — veem o painel sysadmin e podem conceder ou revogar acesso de outros. Cada alteração é registrada."
                : "Everyone listed here has owner access — they see the sysadmin board and can grant / revoke other owners. Every change is logged."}
            </p>
          </div>
        </div>

        {/* Current owners */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt
              ? `Proprietários atuais · ${currentOwners.length}`
              : `Current owners · ${currentOwners.length}`}
          </p>
          <div className="space-y-2">
            {currentOwners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {pt
                  ? "Sem proprietários — verifique se a migration de bootstrap rodou."
                  : "No owners — check the bootstrap migration ran."}
              </p>
            ) : null}
            {currentOwners.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold">
                    {o.fullName}
                    {o.isOrigin ? (
                      <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        {pt ? "Proprietário original" : "Origin owner"}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {o.email ?? "—"} ·{" "}
                    {o.isOrigin
                      ? pt
                        ? "seed permanente"
                        : "bootstrap seed, permanent"
                      : pt
                        ? `concedido em ${o.grantedAt ? fmtDateTime(o.grantedAt) : "desconhecido"}`
                        : `granted ${o.grantedAt ? fmtDateTime(o.grantedAt) : "unknown"}`}
                  </p>
                </div>
                {o.isOrigin ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    {pt ? "Bloqueado" : "Locked"}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revoke(o.id, o.fullName)}
                    disabled={pending || currentOwners.length <= 1}
                    className="gap-1.5 text-xs"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {pt ? "Revogar" : "Revoke"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grant form */}
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Conceder novo proprietário" : "Grant new owner"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={pt ? "email da conta" : "account email"}
              className="h-9 flex-1 min-w-[220px]"
              disabled={pending}
            />
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                pt
                  ? "nota opcional para o log de auditoria"
                  : "optional note for the audit log"
              }
              className="h-9 flex-1 min-w-[220px]"
              disabled={pending}
            />
            <Button
              type="button"
              onClick={grant}
              disabled={pending || !email.trim()}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              {pt ? "Conceder" : "Grant"}
            </Button>
          </div>
        </div>

        {/* Audit timeline */}
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            {pt ? "Alterações recentes de função" : "Recent role changes"}
          </p>
          {audit.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {pt
                ? "Nenhuma alteração de função registrada ainda."
                : "No role changes recorded yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {audit.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-border/60 bg-card/40 px-2 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-muted-foreground">
                    {fmtDateTime(row.createdAt)}
                  </span>
                  <span className="font-medium">
                    {row.actorName ?? "system"}
                  </span>
                  <span className="text-muted-foreground">
                    {row.newRole === "owner"
                      ? pt
                        ? "concedeu"
                        : "granted"
                      : pt
                        ? "revogou"
                        : "revoked"}
                  </span>
                  <span className="font-medium">
                    {row.subjectName ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    ({row.previousRole} → {row.newRole})
                  </span>
                  {row.reason ? (
                    <span className="italic text-muted-foreground">
                      · {row.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
