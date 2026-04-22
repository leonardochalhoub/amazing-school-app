"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/context";
import { setTeacherXpEnabled } from "@/lib/actions/teacher-xp-toggle";

interface Props {
  initialEnabled: boolean;
}

/**
 * Opt-in switch for teacher XP + badges. When OFF, no new xp_events
 * are written and the XP UI is hidden platform-wide; flipping it
 * back ON later resumes the teacher's progression exactly where
 * they left off — every historical row stays intact.
 */
export function TeacherXpToggle({ initialEnabled }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !enabled;
    startTransition(async () => {
      const prior = enabled;
      setEnabled(next);
      const res = await setTeacherXpEnabled(next);
      if ("error" in res) {
        setEnabled(prior);
        toast.error(res.error);
        return;
      }
      toast.success(
        next
          ? pt
            ? "XP e medalhas ligados"
            : "XP and badges turned on"
          : pt
            ? "XP e medalhas desligados"
            : "XP and badges turned off",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            enabled
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {enabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {pt
              ? "Participar da experiência de XP"
              : "Participate in the XP experience"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {pt
              ? enabled
                ? "Ligado. Aulas ao vivo, lições e conquistas somam XP e podem desbloquear medalhas para você."
                : "Desligado. Nenhuma atividade soma XP ou abre medalhas — nada aparece no seu painel. Ligue quando quiser; você retoma exatamente de onde parou, com todas as medalhas preservadas."
              : enabled
                ? "On. Live classes, lessons, and achievements earn you XP and can unlock badges."
                : "Off. No activity writes XP or unlocks badges — nothing appears on your dashboard. Flip it on anytime; you resume exactly where you left off, with every earned badge preserved."}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          enabled
            ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]"
            : "bg-muted"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
