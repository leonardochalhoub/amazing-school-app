"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Mic } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { SpeakingStatsRow } from "@/lib/actions/speaking-events";

interface Props {
  rows: SpeakingStatsRow[];
  /** Sysadmin surfaces raw profile ids without teacher-scoped links. */
  linkStudents?: boolean;
}

const PREVIEW = 10;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

/**
 * Speaking-lab per-user usage table — same shape as the AI-tutor
 * table. Counts each mic activation (speaking_events row) and sums
 * the recorded duration in minutes.
 */
export function SpeakingStatsTable({ rows, linkStudents = true }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - visible.length;

  const t = pt
    ? {
        empty:
          "Nenhuma atividade de fala ainda — assim que alguém usar o microfone, aparece aqui.",
        headStudent: "Aluno",
        headClassroom: "Turma",
        headDays: "Dias",
        headPerDay: "Eventos/dia",
        headEvents: "Eventos",
        headMinutes: "Minutos",
        headLast: "Último",
        showLess: "Mostrar menos",
        showAll: (n: number) => `Mostrar todos os ${n} alunos`,
      }
    : {
        empty:
          "No speaking activity yet — once anyone uses the mic, they'll show up here.",
        headStudent: "Student",
        headClassroom: "Classroom",
        headDays: "Days",
        headPerDay: "Events/day",
        headEvents: "Events",
        headMinutes: "Minutes",
        headLast: "Last",
        showLess: "Show less",
        showAll: (n: number) => `Show all ${n} students`,
      };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-right">#</th>
            <th className="px-3 py-2">
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-3 w-3" />
                {t.headStudent}
              </span>
            </th>
            <th className="px-3 py-2">{t.headClassroom}</th>
            <th className="px-3 py-2 text-right">{t.headDays}</th>
            <th className="px-3 py-2 text-right">{t.headPerDay}</th>
            <th className="px-3 py-2 text-right">{t.headEvents}</th>
            <th className="px-3 py-2 text-right">{t.headMinutes}</th>
            <th className="px-3 py-2 text-right whitespace-nowrap">
              {t.headLast}
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.studentId} className="border-t align-top">
              <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </td>
              <td className="px-3 py-2 font-medium">
                {linkStudents ? (
                  <Link
                    href={`/teacher/students/${r.studentId}`}
                    className="hover:text-primary hover:underline"
                  >
                    {r.fullName}
                  </Link>
                ) : (
                  r.fullName
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {r.classroomName ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.activeDays}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.eventsPerDay.toLocaleString(pt ? "pt-BR" : "en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {r.totalEvents.toLocaleString(pt ? "pt-BR" : "en-US")}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.totalMinutes.toLocaleString(pt ? "pt-BR" : "en-US")}
              </td>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                {fmtDate(r.lastAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PREVIEW ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {showAll ? t.showLess : t.showAll(rows.length)}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
          {!showAll && hidden > 0 ? (
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              (+{hidden})
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
