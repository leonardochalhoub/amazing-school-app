"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { updateClassLog } from "@/lib/actions/schedule";

export interface PastClass {
  id: string;
  title: string;
  meeting_url: string;
  scheduled_at: string;
  observations: string | null;
  completion_status: "held" | "cancelled" | "rescheduled" | null;
}

interface Props {
  classes: PastClass[];
}

type Status = NonNullable<PastClass["completion_status"]>;

const STATUS_META: Record<
  Status,
  { color: string; Icon: typeof CalendarCheck }
> = {
  held: { color: "text-emerald-600 dark:text-emerald-300", Icon: CalendarCheck },
  cancelled: { color: "text-rose-600 dark:text-rose-300", Icon: CalendarX },
  rescheduled: { color: "text-amber-600 dark:text-amber-300", Icon: CalendarClock },
};

export function PastClassLog({ classes }: Props) {
  const { locale } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(classes);

  const t = locale === "pt-BR"
    ? {
        heading: "Aulas passadas",
        hint: "Registre como cada aula foi, adicione observações e marque o status.",
        empty: "Nenhuma aula passada ainda.",
        observations: "Observações",
        obsPlaceholder: "Como foi a aula? O que funcionou? Pontos a melhorar?",
        status: "Status",
        held: "Aconteceu",
        cancelled: "Cancelada",
        rescheduled: "Remarcada",
        none: "Sem status",
        save: "Salvar",
        saving: "Salvando…",
        edit: "Editar",
        cancel: "Cancelar",
        saved: "Entrada salva",
      }
    : {
        heading: "Past classes",
        hint: "Log how each class went, add observations, and mark the status.",
        empty: "No past classes yet.",
        observations: "Observations",
        obsPlaceholder:
          "How did the class go? What worked? What to improve next time?",
        status: "Status",
        held: "Held",
        cancelled: "Cancelled",
        rescheduled: "Rescheduled",
        none: "No status",
        save: "Save",
        saving: "Saving…",
        edit: "Edit",
        cancel: "Cancel",
        saved: "Log saved",
      };

  function beginEdit(c: PastClass) {
    setOpenId(c.id);
    setObs(c.observations ?? "");
    setStatus(c.completion_status ?? "");
  }

  function cancelEdit() {
    setOpenId(null);
    setObs("");
    setStatus("");
  }

  function save(classId: string) {
    startTransition(async () => {
      const r = await updateClassLog({
        classId,
        observations: obs.trim() || null,
        completionStatus: status || null,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
      } else {
        toast.success(t.saved);
        setLocal((prev) =>
          prev.map((c) =>
            c.id === classId
              ? {
                  ...c,
                  observations: obs.trim() || null,
                  completion_status: status || null,
                }
              : c
          )
        );
        cancelEdit();
      }
    });
  }

  const dateFmt = new Intl.DateTimeFormat(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{t.heading}</h2>
        <p className="text-[11px] text-muted-foreground">{t.hint}</p>
      </div>

      {local.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {local.map((c) => {
            const isEditing = openId === c.id;
            const statusMeta = c.completion_status
              ? STATUS_META[c.completion_status]
              : null;
            const StatusIcon = statusMeta?.Icon;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{c.title}</p>
                      {c.completion_status ? (
                        <Badge
                          variant={
                            c.completion_status === "held"
                              ? "default"
                              : c.completion_status === "cancelled"
                                ? "outline"
                                : "secondary"
                          }
                          className="gap-1 text-[10px]"
                        >
                          {StatusIcon ? (
                            <StatusIcon className={`h-3 w-3 ${statusMeta?.color}`} />
                          ) : null}
                          {t[c.completion_status]}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {dateFmt.format(new Date(c.scheduled_at))}
                    </p>
                  </div>

                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => beginEdit(c)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.edit}
                    </Button>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.status}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStatus("")}
                          className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-colors ${
                            status === ""
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-muted-foreground hover:border-foreground/40"
                          }`}
                        >
                          {t.none}
                        </button>
                        {(["held", "cancelled", "rescheduled"] as const).map(
                          (s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-colors ${
                                status === s
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:border-foreground/40"
                              }`}
                            >
                              {t[s]}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.observations}
                      </label>
                      <textarea
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        placeholder={t.obsPlaceholder}
                        maxLength={8000}
                        className="min-h-[100px] w-full rounded-md border border-border bg-background p-2 text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={pending}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t.cancel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => save(c.id)}
                        disabled={pending}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {pending ? t.saving : t.save}
                      </Button>
                    </div>
                  </div>
                ) : c.observations ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                    {c.observations}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
