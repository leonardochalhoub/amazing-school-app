"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { TeacherAiChatRow } from "@/lib/actions/teacher-ai-chat";

interface Props {
  rows: TeacherAiChatRow[];
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

export function AiChatStatsTable({ rows }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - visible.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No AI-tutor activity yet — once a student talks to the tutor,
        their counts will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-[560px] w-full text-sm">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-right">#</th>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Classroom</th>
            <th className="px-3 py-2 text-right">Days</th>
            <th className="px-3 py-2 text-right">Msgs/day</th>
            <th className="px-3 py-2 text-right">Messages</th>
            <th className="px-3 py-2 text-right whitespace-nowrap">Last</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.studentId} className="border-t align-top">
              <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </td>
              <td className="px-3 py-2 font-medium">
                <Link
                  href={`/teacher/students/${r.studentId}`}
                  className="hover:text-primary hover:underline"
                >
                  {r.fullName}
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {r.classroomName ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.activeDays}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.messagesPerDay.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {r.messages.toLocaleString("pt-BR")}
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
          {showAll ? "Show less" : `Show all ${rows.length} students`}
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
