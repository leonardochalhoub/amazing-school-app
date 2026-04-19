import { Calendar, Clock, ExternalLink, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  HistoryStatus,
  StudentHistoryEntry,
} from "@/lib/actions/student-history-types";

type Row = StudentHistoryEntry & { teacher_name: string | null };

const STATUS_COLOR: Record<HistoryStatus, string> = {
  Planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-red-500/10 text-red-700 dark:text-red-400",
  "Rescheduled by student": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Rescheduled by teacher": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Make up class": "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

interface Props {
  entries: Row[];
}

export function MyClassesPanel({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="my-classes-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="my-classes-heading"
          className="min-w-0 break-words text-lg font-semibold tracking-tight"
        >
          Your recent classes
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {entries.length} shown
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
              >
                {/* Top row on mobile: date + status pill + (optional) join link. */}
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {e.event_date}
                  </span>
                  {e.event_time ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {e.event_time.slice(0, 5)}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[e.status]}`}
                  >
                    {e.status}
                  </span>
                  {e.meeting_link ? (
                    <a
                      href={e.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Join
                    </a>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  {e.lesson_content ? (
                    <p className="break-words text-xs text-muted-foreground">
                      {e.lesson_content}
                    </p>
                  ) : null}
                  {e.skill_focus.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.skill_focus.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {e.teacher_name ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      {e.teacher_name}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
