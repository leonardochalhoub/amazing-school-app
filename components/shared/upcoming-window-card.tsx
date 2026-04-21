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
  const [days, setDays] = useState<number>(
    Number.isFinite(initial) ? initial : 5,
  );
  const [pending, startTransition] = useTransition();

  function save() {
    const n = Math.max(0, Math.min(30, Math.round(days)));
    startTransition(async () => {
      const res = await updateMyUpcomingWindow({ days: n });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        n === 0
          ? "Notificações desativadas"
          : `Notificações para os próximos ${n} dia${n === 1 ? "" : "s"}`,
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-primary" />
          Notificações de aulas · Class alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Quantos dias à frente o pop-up deve olhar para as próximas
          aulas. Padrão 5. Use 0 para desativar o pop-up.
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="upcoming-days">Dias · Days</Label>
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
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
