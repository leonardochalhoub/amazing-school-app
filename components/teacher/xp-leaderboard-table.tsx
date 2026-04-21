"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { StudentRow } from "@/components/teacher/student-card";

interface Props {
  rows: StudentRow[];
}

const PREVIEW = 10;

function fmtDateTime(iso: string | null, pt: boolean): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(pt ? "pt-BR" : "en-US", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ranking de alunos por XP — mirrors the AiChatStatsTable UX: first
 * PREVIEW rows are visible, the rest collapse behind a "Mostrar
 * todos os N alunos" toggle at the bottom so the page doesn't clip
 * with big rosters.
 */
export function XpLeaderboardTable({ rows }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - visible.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {pt ? "Ainda sem alunos." : "No students yet."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2">{pt ? "Aluno" : "Student"}</th>
            <th className="px-4 py-2">{pt ? "Turma" : "Classroom"}</th>
            <th className="px-4 py-2 text-right">XP</th>
            <th className="px-4 py-2 text-right">
              {pt ? "Lições" : "Lessons"}
            </th>
            <th className="px-4 py-2 text-right">
              {pt ? "Sequência" : "Streak"}
            </th>
            <th className="px-4 py-2 text-right whitespace-nowrap">
              {pt ? "Última atividade" : "Last active"}
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.studentId} className="border-t">
              <td className="px-4 py-2 font-medium">
                <Link
                  href={`/teacher/students/${s.studentId}`}
                  className="hover:text-primary hover:underline"
                >
                  {s.fullName}
                </Link>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {s.classroomName ?? "—"}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {s.totalXp.toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {s.completed}/{s.assigned}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {s.streak}
              </td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {fmtDateTime(s.lastActivity, pt)}
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
          {showAll
            ? pt
              ? "Mostrar menos"
              : "Show less"
            : pt
              ? `Mostrar todos os ${rows.length} alunos`
              : `Show all ${rows.length} students`}
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
