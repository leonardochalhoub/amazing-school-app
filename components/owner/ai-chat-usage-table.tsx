"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AiChatTeacherRow {
  id: string;
  name: string;
  messages: number;
  activeDays: number;
}

export interface AiChatStudentRow {
  id: string;
  displayName: string;
  teacherName: string | null;
  messages: number;
  activeDays: number;
}

interface Props {
  rows: (AiChatTeacherRow | AiChatStudentRow)[];
  kind: "teacher" | "student";
}

const PREVIEW = 10;

function isStudentRow(
  r: AiChatTeacherRow | AiChatStudentRow,
): r is AiChatStudentRow {
  return (r as AiChatStudentRow).displayName !== undefined;
}

function titleCaseLocal(name: string): string {
  if (!name) return "—";
  const lowers = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && lowers.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function AiChatUsageTable({ rows, kind }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - visible.length;
  const noun = kind === "teacher" ? "teachers" : "students";

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table
        className={`${kind === "student" ? "min-w-[560px]" : "min-w-[440px]"} w-full text-sm`}
      >
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-4 py-2 text-right">#</th>
            <th className="px-4 py-2">
              {kind === "teacher" ? "Teacher" : "Student"}
            </th>
            {kind === "student" ? (
              <th className="px-4 py-2">Teacher</th>
            ) : null}
            <th className="px-4 py-2 text-right">Days</th>
            <th className="px-4 py-2 text-right">Messages</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td
                colSpan={kind === "student" ? 5 : 4}
                className="px-4 py-6 text-center text-xs text-muted-foreground"
              >
                No {noun} have used the AI tutor yet.
              </td>
            </tr>
          ) : null}
          {visible.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </td>
              <td className="px-4 py-2 font-medium">
                {titleCaseLocal(
                  isStudentRow(r) ? r.displayName : r.name,
                )}
              </td>
              {isStudentRow(r) ? (
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {r.teacherName ? titleCaseLocal(r.teacherName) : "—"}
                </td>
              ) : null}
              <td className="px-4 py-2 text-right tabular-nums">
                {r.activeDays}
              </td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">
                {r.messages.toLocaleString()}
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
          {showAll ? "Show less" : `Show all ${rows.length} ${noun}`}
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
