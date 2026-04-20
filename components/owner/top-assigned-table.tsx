"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface TopAssignedRow {
  slug: string;
  title: string;
  cefr: string | null;
  count: number;
}

interface Props {
  rows: TopAssignedRow[];
  unit: "lesson" | "song";
}

const PREVIEW = 10;

/**
 * Collapsible top-N table. Shows the 10 most-assigned rows, with a
 * Show all button that reveals the full list. Dedicated client
 * component so the sysadmin page can stay server-rendered.
 */
export function TopAssignedTable({ rows, unit }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - visible.length;
  const unitLabel = unit === "lesson" ? "lessons" : "songs";

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-[480px] w-full text-sm">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-right">#</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2 text-right">CEFR</th>
            <th className="px-3 py-2 text-right">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-center text-xs text-muted-foreground"
              >
                No {unitLabel} assigned yet.
              </td>
            </tr>
          ) : null}
          {visible.map((r, i) => (
            <tr key={r.slug} className="border-t">
              <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}
              </td>
              <td className="px-3 py-2 font-medium">{r.title}</td>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                {r.cefr ? r.cefr.toUpperCase() : "—"}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {r.count.toLocaleString()}
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
          {showAll ? "Show less" : `Show all ${rows.length} ${unitLabel}`}
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
