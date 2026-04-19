import Link from "next/link";
import { Calendar, Clock, ExternalLink, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  HistoryStatus,
  StudentHistoryEntry,
} from "@/lib/actions/student-history-types";

const STATUS_COLOR: Record<HistoryStatus, string> = {
  Planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-red-500/10 text-red-700 dark:text-red-400",
  "Rescheduled by student": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Rescheduled by teacher": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Make up class": "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

type Row = StudentHistoryEntry & { student_name: string | null };

interface Props {
  entries: Row[];
}

export function ClassLogPanel({ entries }: Props) {
  const planned = entries.filter((e) => e.status === "Planned").length;
  return (
    <section aria-labelledby="class-log-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2
            id="class-log-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Class log
          </h2>
          <p className="text-xs text-muted-foreground">
            Every scheduled / past session you created across all students.
            Syncs live with the History panel inside each student profile.
            {planned > 0 ? (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  {planned} planned.
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-center text-sm text-muted-foreground">
            No classes scheduled yet. Use{" "}
            <strong>Schedule class</strong> above to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Content</th>
                <th className="px-3 py-2">Skills</th>
                <th className="px-3 py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const profileHref = e.roster_student_id
                  ? `/teacher/students/${e.roster_student_id}`
                  : null;
                return (
                  <tr key={e.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {e.event_date}
                      </div>
                      {e.event_time ? (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {e.event_time.slice(0, 5)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary"
                        >
                          <User className="h-3 w-3" />
                          {e.student_name ?? "Student"}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {e.student_name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[e.status]}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">
                      {e.lesson_content ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {e.skill_focus.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        ) : (
                          e.skill_focus.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.meeting_link ? (
                        <a
                          href={e.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Join
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
