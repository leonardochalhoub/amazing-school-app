"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveHistoryEntry,
  deleteHistoryEntry,
} from "@/lib/actions/student-history";
import {
  HISTORY_STATUSES,
  SKILL_FOCUS_OPTIONS,
  formatHoursMinutes,
  type HistoryStatus,
  type SkillFocus,
  type StudentHistoryEntry,
} from "@/lib/actions/student-history-types";

/** Render "1h 30min" between two HH:mm strings on the same day. */
function formatDuration(startHHmm: string, endHHmm: string): string {
  const [sh, sm] = startHHmm.split(":").map(Number);
  const [eh, em] = endHHmm.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "—";
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return formatHoursMinutes(Math.max(0, endMin - startMin));
}

interface Props {
  entry: StudentHistoryEntry & { student_name?: string | null };
  triggerClassName?: string;
}

/**
 * Row-level edit dialog for entries in the teacher's master class
 * log. Mirrors the field set on the per-student history panel but
 * kept inline so the teacher can fix any class without diving into
 * each student's profile first.
 */
export function EditClassDialog({ entry, triggerClassName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventDate, setEventDate] = useState(entry.event_date);
  const [eventTime, setEventTime] = useState(entry.event_time ?? "");
  const [endTime, setEndTime] = useState(
    (entry as { end_time?: string | null }).end_time ?? "",
  );
  const [status, setStatus] = useState<HistoryStatus>(entry.status);
  const [meetingLink, setMeetingLink] = useState(entry.meeting_link ?? "");
  const [lessonContent, setLessonContent] = useState(
    entry.lesson_content ?? "",
  );
  const [skillFocus, setSkillFocus] = useState<SkillFocus[]>(
    entry.skill_focus ?? [],
  );
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function toggleSkill(s: SkillFocus) {
    setSkillFocus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function submit() {
    if (!eventDate) {
      toast.error("Data obrigatória");
      return;
    }
    startTransition(async () => {
      const res = await saveHistoryEntry({
        id: entry.id,
        student_id: entry.student_id,
        roster_student_id: entry.roster_student_id,
        classroom_id: entry.classroom_id,
        event_date: eventDate,
        event_time: eventTime || null,
        end_time: endTime || null,
        status,
        lesson_content: lessonContent,
        skill_focus: skillFocus,
        meeting_link: meetingLink,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Aula atualizada");
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Excluir esta aula?")) return;
    startDeleteTransition(async () => {
      const res = await deleteHistoryEntry(entry.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Aula excluída");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <Pencil className="h-3 w-3" />
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
            <DialogDescription>
              {entry.student_name
                ? `Aluno · ${entry.student_name}`
                : "Atualize data, status, link e conteúdo desta aula."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-time">Início</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end-time">Fim</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
            {status === "Done" && eventTime && endTime ? (
              <p className="text-[11px] text-muted-foreground">
                Duração:{" "}
                <span className="font-semibold text-foreground">
                  {formatDuration(eventTime, endTime)}
                </span>{" "}
                — somado às horas de aula ao vivo do aluno.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as HistoryStatus)}
                disabled={pending}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                {HISTORY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-link">Link da reunião</Label>
              <Input
                id="edit-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Habilidades</Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_FOCUS_OPTIONS.map((s) => {
                  const on = skillFocus.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      disabled={pending}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-content">Conteúdo da aula</Label>
              <Textarea
                id="edit-content"
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                disabled={pending}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={deletePending || pending}
              className="gap-1.5"
            >
              {deletePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={pending}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
