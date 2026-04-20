"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(!initial);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (trimmed.length > 80) {
      toast.error("Location must be 80 characters or fewer");
      return;
    }
    startTransition(async () => {
      const res = await updateMyLocation({ location: trimmed });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        trimmed
          ? "Location saved"
          : "Location cleared",
      );
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
          Location · Localização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Cidade ou país — por exemplo, "São Paulo, SP" ou "Tokyo".
          Visible to your teacher.
        </p>
        {editing ? (
          <div className="space-y-3">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={80}
              placeholder="São Paulo, SP"
              disabled={pending}
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
                  Cancel
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
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {initial ?? (
                <span className="text-muted-foreground">Not set</span>
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
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
