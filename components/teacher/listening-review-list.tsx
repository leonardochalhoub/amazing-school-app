"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  reviewListeningResponse,
  type ListeningResponseRow,
} from "@/lib/actions/listening-responses";

interface Props {
  rows: ListeningResponseRow[];
}

export function ListeningReviewList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
        <p className="text-sm font-medium">No listening responses yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Once students submit written interpretations, they will appear here
          for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <ReviewCard key={row.id} row={row} />
      ))}
    </div>
  );
}

function ReviewCard({ row }: { row: ListeningResponseRow }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(row.teacher_feedback ?? "");
  const [score, setScore] = useState<string>(
    row.teacher_score != null ? String(row.teacher_score) : "",
  );
  const [pending, startTransition] = useTransition();

  const reviewed = Boolean(row.reviewed_at);

  function submit() {
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Score must be a number between 0 and 100");
      return;
    }
    startTransition(async () => {
      const res = await reviewListeningResponse({
        responseId: row.id,
        feedback,
        score: parsed,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Feedback saved.");
      router.refresh();
    });
  }

  return (
    <Card
      className={
        reviewed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      }
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{row.student_name}</p>
          <Badge variant="outline" className="text-[10px]">
            {row.lesson_slug}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {row.scene_id}
          </Badge>
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            {new Date(row.submitted_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
          {reviewed ? (
            <Badge className="gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Reviewed
            </Badge>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Student response
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {row.response_text}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your feedback
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Short comment in English or Portuguese…"
              className="min-h-20"
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Score 0–100
            </label>
            <Input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="0-100"
              inputMode="numeric"
              disabled={pending}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={pending} className="gap-1.5">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {reviewed ? "Update review" : "Save review"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
