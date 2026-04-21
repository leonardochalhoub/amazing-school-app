"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { updateMyGender } from "@/lib/actions/profile";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  initial: "female" | "male" | null;
}

/**
 * Inline gender toggle used on the teacher profile hero. Drives
 * pt-BR wording ("Professor" vs "Professora") and nothing else.
 * Appears as a tiny "Professor / Professora" link strip under
 * the role label.
 */
export function TeacherGenderPicker({ initial }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [value, setValue] = useState<"female" | "male" | null>(initial);
  const [pending, startTransition] = useTransition();

  function pick(next: "female" | "male") {
    if (next === value || pending) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const res = await updateMyGender({ gender: next });
      if ("error" in res) {
        toast.error(res.error);
        setValue(previous);
        return;
      }
      toast.success(pt ? "Salvo" : "Saved");
    });
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span>{pt ? "Sou:" : "I am:"}</span>
      <button
        type="button"
        onClick={() => pick("male")}
        disabled={pending}
        className={`rounded-md px-2 py-0.5 transition-colors ${
          value === "male"
            ? "bg-primary/15 font-semibold text-primary"
            : "hover:bg-muted"
        }`}
      >
        {value === "male" ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            {pt ? "Professor" : "Teacher (m)"}
          </span>
        ) : pt ? (
          "Professor"
        ) : (
          "Teacher (m)"
        )}
      </button>
      <button
        type="button"
        onClick={() => pick("female")}
        disabled={pending}
        className={`rounded-md px-2 py-0.5 transition-colors ${
          value === "female"
            ? "bg-primary/15 font-semibold text-primary"
            : "hover:bg-muted"
        }`}
      >
        {value === "female" ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            {pt ? "Professora" : "Teacher (f)"}
          </span>
        ) : pt ? (
          "Professora"
        ) : (
          "Teacher (f)"
        )}
      </button>
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
