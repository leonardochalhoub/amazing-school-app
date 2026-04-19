"use client";

import Image from "next/image";
import { DEMO_PRESETS, type DemoKind } from "@/lib/demo/presets";

type Props = {
  teacherLabel: string;
  studentLabel: string;
  teacherHint: string;
  studentHint: string;
};

export function DemoAccess({
  teacherLabel,
  studentLabel,
  teacherHint,
  studentHint,
}: Props) {
  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
      <DemoButton
        kind="teacher"
        label={teacherLabel}
        hint={teacherHint}
        accent="from-emerald-500 to-teal-600"
      />
      <DemoButton
        kind="student"
        label={studentLabel}
        hint={studentHint}
        accent="from-indigo-500 to-violet-600"
      />
    </div>
  );
}

function DemoButton({
  kind,
  label,
  hint,
  accent,
}: {
  kind: DemoKind;
  label: string;
  hint: string;
  accent: string;
}) {
  const preset = DEMO_PRESETS[kind];
  return (
    // Native form POST + target="_blank" so the demo session cookie is set
    // inside the NEW tab and the landing page keeps its own state. A server
    // action wouldn't follow target="_blank" cleanly; an API route does.
    <form
      action="/api/demo-login"
      method="POST"
      target="_blank"
      rel="noopener noreferrer"
      className="contents"
    >
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
        className="group relative flex min-w-[230px] items-center gap-3 rounded-2xl border border-border bg-card/70 p-2.5 pr-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <span
          className={`relative block h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${accent} ring-2 ring-background`}
        >
          <Image
            src={preset.photo}
            alt={preset.displayName}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {hint}
          </span>
          <span className="truncate text-sm font-semibold">{label}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {preset.displayName}
          </span>
        </span>
        <span
          aria-hidden
          className="ml-auto text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary"
        >
          ↗
        </span>
      </button>
    </form>
  );
}
