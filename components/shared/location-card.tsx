"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrazilCityPicker } from "@/components/shared/brazil-city-picker";
import { useI18n } from "@/lib/i18n/context";
import { updateMyLocation } from "@/lib/actions/profile";

interface Props {
  initial: string | null;
}

/**
 * Free-form "where I live" card. Optional, capped at 80 chars.
 * Kept collapsed-on-filled / expanded-on-empty so first-time
 * students see the field but returning students see their value
 * at a glance.
 */
export function LocationCard({ initial }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(!initial);
  const [pending, startTransition] = useTransition();

  const t = pt
    ? {
        title: "Localização",
        help:
          'Comece a digitar o nome da cidade — a lista filtra as ~5,5 mil cidades do IBGE automaticamente. Fora do Brasil? Digite livremente (ex.: "Tokyo").',
        placeholder: "São Paulo, SP",
        notSet: "Não preenchida",
        cancel: "Cancelar",
        save: "Salvar",
        edit: "Editar",
        tooLong: "A localização deve ter no máximo 80 caracteres.",
        saved: "Localização salva",
        cleared: "Localização removida",
      }
    : {
        title: "Location",
        help:
          'Start typing a city — the list filters ~5.5k Brazilian cities from IBGE. Outside Brazil? Type freely (e.g. "Tokyo").',
        placeholder: "São Paulo, SP",
        notSet: "Not set",
        cancel: "Cancel",
        save: "Save",
        edit: "Edit",
        tooLong: "Location must be 80 characters or fewer.",
        saved: "Location saved",
        cleared: "Location cleared",
      };

  function save() {
    const trimmed = value.trim();
    if (trimmed.length > 80) {
      toast.error(t.tooLong);
      return;
    }
    startTransition(async () => {
      const res = await updateMyLocation({ location: trimmed });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(trimmed ? t.saved : t.cleared);
      setEditing(false);
    });
  }

  function cancel() {
    setValue(initial ?? "");
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t.help}</p>
        {editing ? (
          <div className="space-y-3">
            <BrazilCityPicker
              value={value}
              onChange={setValue}
              disabled={pending}
              placeholder={t.placeholder}
              maxLength={80}
            />
            <div className="flex justify-end gap-2">
              {initial ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancel}
                  disabled={pending}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  {t.cancel}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
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
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {initial ?? (
                <span className="text-muted-foreground">{t.notSet}</span>
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t.edit}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
