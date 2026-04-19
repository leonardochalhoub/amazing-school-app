import Link from "next/link";
import { CheckCircle2, Clock, MessageSquare, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ListeningResponseRow } from "@/lib/actions/listening-responses";

interface Props {
  entries: ListeningResponseRow[];
}

export function ListeningFeedbackPanel({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="listening-feedback-heading" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2
          id="listening-feedback-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Teacher feedback on your listening responses
        </h2>
        <span className="text-xs text-muted-foreground">
          {entries.length} submission{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Link
                      href={`/student/lessons/${e.lesson_slug}`}
                      className="font-semibold hover:text-primary"
                    >
                      {e.lesson_slug}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      · {e.scene_id}
                    </span>
                  </div>
                  {e.reviewed_at ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Waiting for teacher
                    </span>
                  )}
                </div>

                <blockquote className="border-l-2 border-border pl-3 text-xs text-muted-foreground">
                  {e.response_text}
                </blockquote>

                {e.reviewed_at ? (
                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
                    {e.teacher_score != null ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <Star className="h-4 w-4 text-amber-500" />
                        Score: {e.teacher_score} / 100
                      </p>
                    ) : null}
                    {e.teacher_feedback ? (
                      <p className="flex items-start gap-1.5 text-xs">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{e.teacher_feedback}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No written feedback.
                      </p>
                    )}
                  </div>
                ) : null}

                <p className="text-[10px] text-muted-foreground">
                  Submitted {new Date(e.submitted_at).toLocaleString()}
                  {e.reviewed_at
                    ? ` · Reviewed ${new Date(e.reviewed_at).toLocaleString()}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
