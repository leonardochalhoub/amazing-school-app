"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BellRing, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";
import { updateMyUpcomingWindow } from "@/lib/actions/profile";

interface Props {
  initial: number;
}

/**
 * Profile-page control for the upcoming-class popup window. 0 opts
 * out of the popup entirely; any other value (1–30) controls how
 * many days ahead the popup scans for scheduled classes.
 */
export function UpcomingWindowCard({ initial }: Props) {
  const { locale } = useI18n();
  const [days, setDays] = useState<number>(
    Number.isFinite(initial) ? initial : 5,
  );
  const [pending, startTransition] = useTransition();

  const pt = locale === "pt-BR";
  const t = pt
    ? {
        title: "Notificações de aulas",
        desc:
          "Quantos dias à frente o pop-up deve olhar para as próximas aulas. Padrão 5. Use 0 para desativar o pop-up.",
        label: "Dias",
        save: "Salvar",
        off: "Notificações desativadas",
        on: (n: number) =>
          `Notificações para os próximos ${n} dia${n === 1 ? "" : "s"}`,
      }
    : {
        title: "Class alerts",
        desc:
          "How many days ahead the popup looks for upcoming classes. Default 5. Use 0 to turn the popup off.",
        label: "Days",
        save: "Save",
        off: "Alerts disabled",
        on: (n: number) =>
          `Alerts on for the next ${n} day${n === 1 ? "" : "s"}`,
      };

  function save() {
    const n = Math.max(0, Math.min(30, Math.round(days)));
    startTransition(async () => {
      const res = await updateMyUpcomingWindow({ days: n });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(n === 0 ? t.off : t.on(n));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t.desc}</p>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="upcoming-days">{t.label}</Label>
            <Input
              id="upcoming-days"
              type="number"
              min={0}
              max={30}
              step={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={pending}
            />
          </div>
          <Button
            type="button"
            onClick={save}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
