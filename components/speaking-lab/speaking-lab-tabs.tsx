"use client";

import { useState } from "react";
import { Mic, MessagesSquare } from "lucide-react";
import { SpeakingLabDrill, type SpeakingDrill } from "./drill-client";
import { SpeakingLabDialogRunner, type SpeakingDialog } from "./dialog-runner";
import { useI18n } from "@/lib/i18n/context";

type Tab = "drills" | "dialogs";

interface Props {
  drills: SpeakingDrill[];
  dialogs: SpeakingDialog[];
}

export function SpeakingLabTabs({ drills, dialogs }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [tab, setTab] = useState<Tab>("drills");

  return (
    <div className="space-y-4">
      <nav className="inline-flex rounded-full border border-border bg-background p-1">
        <TabButton
          active={tab === "drills"}
          onClick={() => setTab("drills")}
          icon={<Mic className="h-3.5 w-3.5" />}
          label={`${pt ? "Exercícios" : "Drills"} (${drills.length})`}
          hint={pt ? "Uma frase por vez" : "One phrase at a time"}
        />
        <TabButton
          active={tab === "dialogs"}
          onClick={() => setTab("dialogs")}
          icon={<MessagesSquare className="h-3.5 w-3.5" />}
          label={`${pt ? "Diálogos" : "Dialogs"} (${dialogs.length})`}
          hint={pt ? "Conversas com várias rodadas" : "Multi-turn conversations"}
        />
      </nav>

      {tab === "drills" ? (
        <SpeakingLabDrill all={drills} />
      ) : (
        <SpeakingLabDialogRunner all={dialogs} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
