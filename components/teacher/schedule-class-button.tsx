"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Save } from "lucide-react";
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
import {
  scheduleClass,
  scheduleClassroomClass,
} from "@/lib/actions/student-history";
import {
  SKILL_FOCUS_OPTIONS,
  type SkillFocus,
} from "@/lib/actions/student-history-types";

interface StudentOption {
  id: string;
  fullName: string;
  classroomId: string | null;
}

interface ClassroomOption {
  id: string;
  name: string;
}

interface Props {
  students: StudentOption[];
  classrooms: ClassroomOption[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Target = "student" | "classroom";

export function ScheduleClassButton({ students, classrooms }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("student");
  const [studentId, setStudentId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventTime, setEventTime] = useState("10:00");
  const [meetingLink, setMeetingLink] = useState("");
  const [skillFocus, setSkillFocus] = useState<SkillFocus[]>([]);
  const [lessonContent, setLessonContent] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTarget("student");
    setStudentId("");
    setClassroomId("");
    setEventDate(todayISO());
    setEventTime("10:00");
    setMeetingLink("");
    setSkillFocus([]);
    setLessonContent("");
  }

  function toggleSkill(s: SkillFocus) {
    setSkillFocus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function submit() {
    if (target === "student" && !studentId) {
      toast.error("Pick a student");
      return;
    }
    if (target === "classroom" && !classroomId) {
      toast.error("Pick a classroom");
      return;
    }
    startTransition(async () => {
      if (target === "classroom") {
        const res = await scheduleClassroomClass({
          classroom_id: classroomId,
          event_date: eventDate,
          event_time: eventTime,
          meeting_link: meetingLink,
          skill_focus: skillFocus,
          lesson_content: lessonContent,
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success(
          `Class scheduled for ${res.created} student${res.created === 1 ? "" : "s"}.`,
        );
      } else {
        const student = students.find((s) => s.id === studentId);
        const res = await scheduleClass({
          roster_student_id: studentId,
          classroom_id: student?.classroomId ?? null,
          event_date: eventDate,
          event_time: eventTime,
          meeting_link: meetingLink,
          skill_focus: skillFocus,
          lesson_content: lessonContent,
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Class scheduled.");
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <CalendarPlus className="h-4 w-4" />
        Schedule class
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a class</DialogTitle>
            <DialogDescription>
              Creates a &lsquo;Planned&rsquo; entry in the student&apos;s
              history with the meeting link. Edit or mark it done later from
              the student profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Schedule for</Label>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setTarget("student")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    target === "student"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  One student
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("classroom")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    target === "classroom"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Whole classroom
                </button>
              </div>
            </div>

            {target === "student" ? (
              <div className="space-y-1.5">
                <Label>Student</Label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">— Pick a student —</option>
                  {students.map((s) => {
                    const classroom = classrooms.find(
                      (c) => c.id === s.classroomId,
                    );
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                        {classroom ? ` · ${classroom.name}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Classroom (all students)</Label>
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">— Pick a classroom —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  One history entry is created per student in the classroom.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Meeting link (Zoom / Google Meet)</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Planned lesson content (optional)</Label>
              <Input
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                placeholder="e.g. Reported speech review + listening drill"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Skill focus (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_FOCUS_OPTIONS.map((s) => {
                  const active = skillFocus.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              className="gap-1.5"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
