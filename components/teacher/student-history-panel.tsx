"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  saveHistoryEntry,
  deleteHistoryEntry,
} from "@/lib/actions/student-history";
import {
  HISTORY_STATUSES,
  SKILL_FOCUS_OPTIONS,
  CEFR_LEVELS,
  type HistoryStatus,
  type SkillFocus,
  type CefrLevel,
  type StudentHistoryEntry,
} from "@/lib/actions/student-history-types";

const STATUS_COLOR: Record<HistoryStatus, string> = {
  Planned: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-red-500/10 text-red-700 dark:text-red-400",
  "Rescheduled by student": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Rescheduled by teacher": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Make up class": "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

interface DraftEntry {
  id?: string;
  event_date: string;
  event_time: string;
  end_time: string;
  status: HistoryStatus;
  cefr_level: CefrLevel | "";
  lesson_content: string;
  skill_focus: SkillFocus[];
  meeting_link: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fromEntry(e: StudentHistoryEntry): DraftEntry {
  return {
    id: e.id,
    event_date: e.event_date,
    event_time: e.event_time ?? "",
    end_time: (e as { end_time?: string | null }).end_time ?? "",
    status: e.status,
    cefr_level:
      ((e as { cefr_level?: CefrLevel | null }).cefr_level as
        | CefrLevel
        | null) ?? "",
    lesson_content: e.lesson_content ?? "",
    skill_focus: e.skill_focus,
    meeting_link: e.meeting_link ?? "",
  };
}

function emptyDraft(): DraftEntry {
  return {
    event_date: todayISO(),
    event_time: "",
    end_time: "",
    status: "Done",
    cefr_level: "",
    lesson_content: "",
    skill_focus: [],
    meeting_link: "",
  };
}

interface Props {
  studentId?: string;
  rosterStudentId?: string;
  classroomId?: string | null;
  entries: StudentHistoryEntry[];
}

export function StudentHistoryPanel({
  studentId,
  rosterStudentId,
  classroomId,
  entries,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 10;
  const visible = showAll ? entries : entries.slice(0, PREVIEW);
  const hidden = entries.length - visible.length;

  function openNew() {
    setDraft(emptyDraft());
  }
  function openEdit(entry: StudentHistoryEntry) {
    setDraft(fromEntry(entry));
  }
  function cancel() {
    setDraft(null);
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const res = await saveHistoryEntry({
        id: draft.id,
        student_id: studentId ?? null,
        roster_student_id: rosterStudentId ?? null,
        classroom_id: classroomId ?? null,
        event_date: draft.event_date,
        event_time: draft.event_time || null,
        end_time: draft.end_time || null,
        status: draft.status,
        lesson_content: draft.lesson_content,
        skill_focus: draft.skill_focus,
        meeting_link: draft.meeting_link,
        cefr_level: draft.cefr_level || null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(draft.id ? "Entry updated." : "Entry added.");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteHistoryEntry(id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Entry deleted.");
      router.refresh();
    });
  }

  function toggleSkill(skill: SkillFocus) {
    if (!draft) return;
    const has = draft.skill_focus.includes(skill);
    setDraft({
      ...draft,
      skill_focus: has
        ? draft.skill_focus.filter((s) => s !== skill)
        : [...draft.skill_focus, skill],
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Student history
          </h2>
          <p className="text-xs text-muted-foreground">
            Past and planned sessions in descending date order. Add entries to
            keep a record of attendance, content, and skill focus.
          </p>
        </div>
        {!draft ? (
          <Button
            type="button"
            size="sm"
            onClick={openNew}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        ) : null}
      </div>

      {draft ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-[160px_120px_1fr]">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draft.event_date}
                  onChange={(e) =>
                    setDraft({ ...draft, event_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Início · Start</Label>
                <Input
                  type="time"
                  value={draft.event_time}
                  onChange={(e) =>
                    setDraft({ ...draft, event_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim · End</Label>
                <Input
                  type="time"
                  value={draft.end_time}
                  onChange={(e) =>
                    setDraft({ ...draft, end_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as HistoryStatus,
                    })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {HISTORY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>CEFR level</Label>
                <select
                  value={draft.cefr_level}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      cefr_level: e.target.value as CefrLevel | "",
                    })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">—</option>
                  {CEFR_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Lesson content</Label>
              <Textarea
                value={draft.lesson_content}
                onChange={(e) =>
                  setDraft({ ...draft, lesson_content: e.target.value })
                }
                rows={2}
                placeholder="What was covered in this session"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Skill focus (select one or more)</Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_FOCUS_OPTIONS.map((skill) => {
                  const active = draft.skill_focus.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Meeting link (Zoom / Google Meet, optional)</Label>
              <Input
                value={draft.meeting_link}
                onChange={(e) =>
                  setDraft({ ...draft, meeting_link: e.target.value })
                }
                placeholder="https://meet.google.com/… or https://zoom.us/…"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
                disabled={pending}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={pending}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {draft.id ? "Save changes" : "Add entry"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No history yet. Add the first entry.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Lesson content</th>
                <th className="px-3 py-2">Skill focus</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
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
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[e.status]}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="max-w-xs px-3 py-2 text-xs text-muted-foreground">
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
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {showAll ? "Show less" : `Show all ${entries.length} entries`}
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
      )}
    </section>
  );
}
