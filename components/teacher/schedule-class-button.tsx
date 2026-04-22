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
  CEFR_LEVELS,
  type SkillFocus,
  type CefrLevel,
} from "@/lib/actions/student-history-types";
import { useI18n } from "@/lib/i18n/context";

function translateSkill(s: SkillFocus, pt: boolean): string {
  if (!pt) return s;
  switch (s) {
    case "Grammar":
      return "Gramática";
    case "Speaking":
      return "Fala";
    case "Vocabulary":
      return "Vocabulário";
    case "Listening":
      return "Escuta";
    case "Reading":
      return "Leitura";
    case "Writing":
      return "Escrita";
  }
}

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
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("student");
  const [studentId, setStudentId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventTime, setEventTime] = useState("10:00");
  const [meetingLink, setMeetingLink] = useState("");
  const [skillFocus, setSkillFocus] = useState<SkillFocus[]>([]);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel | "">("");
  const [lessonContent, setLessonContent] = useState("");
  const [xpReward, setXpReward] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTarget("student");
    setStudentId("");
    setClassroomId("");
    setEventDate(todayISO());
    setEventTime("10:00");
    setMeetingLink("");
    setSkillFocus([]);
    setCefrLevel("");
    setLessonContent("");
  }

  function toggleSkill(s: SkillFocus) {
    setSkillFocus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function submit() {
    if (target === "student" && !studentId) {
      toast.error(pt ? "Selecione um aluno" : "Pick a student");
      return;
    }
    if (target === "classroom" && !classroomId) {
      toast.error(pt ? "Selecione uma turma" : "Pick a classroom");
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
          cefr_level: cefrLevel || null,
          xp_reward:
            xpReward.trim() === "" || !Number.isFinite(Number(xpReward))
              ? null
              : Math.max(0, Math.min(5000, Math.round(Number(xpReward)))),
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success(
          pt
            ? `Aula agendada para ${res.created} ${res.created === 1 ? "aluno" : "alunos"}.`
            : `Class scheduled for ${res.created} student${res.created === 1 ? "" : "s"}.`,
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
          cefr_level: cefrLevel || null,
          xp_reward:
            xpReward.trim() === "" || !Number.isFinite(Number(xpReward))
              ? null
              : Math.max(0, Math.min(5000, Math.round(Number(xpReward)))),
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success(pt ? "Aula agendada." : "Class scheduled.");
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
        {pt ? "Agendar aula" : "Schedule class"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pt ? "Agendar uma aula" : "Schedule a class"}
            </DialogTitle>
            <DialogDescription>
              {pt
                ? "Cria uma entrada \"Agendada\" no histórico do aluno com o link da reunião. Edite ou marque como concluída depois no perfil do aluno."
                : "Creates a 'Planned' entry in the student's history with the meeting link. Edit or mark it done later from the student profile."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{pt ? "Agendar para" : "Schedule for"}</Label>
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
                  {pt ? "Um aluno" : "One student"}
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
                  {pt ? "Turma inteira" : "Whole classroom"}
                </button>
              </div>
            </div>

            {target === "student" ? (
              <div className="space-y-1.5">
                <Label>{pt ? "Aluno" : "Student"}</Label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">
                    {pt ? "— Selecione um aluno —" : "— Pick a student —"}
                  </option>
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
                <Label>
                  {pt ? "Turma (todos os alunos)" : "Classroom (all students)"}
                </Label>
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  <option value="">
                    {pt ? "— Selecione uma turma —" : "— Pick a classroom —"}
                  </option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {pt
                    ? "Uma entrada de histórico é criada para cada aluno da turma."
                    : "One history entry is created per student in the classroom."}
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{pt ? "Data" : "Date"}</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{pt ? "Hora" : "Time"}</Label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                {pt
                  ? "Link da reunião (Zoom / Google Meet)"
                  : "Meeting link (Zoom / Google Meet)"}
              </Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {pt
                  ? "Conteúdo planejado (opcional)"
                  : "Planned lesson content (optional)"}
              </Label>
              <Input
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                placeholder={
                  pt
                    ? "ex.: revisão de discurso indireto + exercício de escuta"
                    : "e.g. Reported speech review + listening drill"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {pt
                  ? "Habilidades em foco (opcional)"
                  : "Skill focus (optional)"}
              </Label>
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
                      {translateSkill(s, pt)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-cefr">
                {pt ? "Nível CEFR (opcional)" : "CEFR level (optional)"}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCefrLevel("")}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    cefrLevel === ""
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  —
                </button>
                {CEFR_LEVELS.map((lvl) => {
                  const active = cefrLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCefrLevel(lvl)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional integer XP awarded when the class is marked
                Done. Shared by teacher (gated on xp_enabled) + every
                participant. Blank = 30 (default). */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                {pt ? "XP da aula (opcional)" : "Class XP (optional)"}
              </label>
              <input
                type="number"
                min={0}
                max={5000}
                step={10}
                value={xpReward}
                onChange={(e) => setXpReward(e.target.value)}
                placeholder={pt ? "30 (padrão)" : "30 (default)"}
                disabled={pending}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                {pt
                  ? "Atribuído a cada participante (professor e alunos) quando a aula é marcada como concluída. Professor fica de fora se tiver XP desligado no perfil."
                  : "Awarded to every participant (teacher + students) when the class is marked Done. Teacher skipped if XP is off in profile."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {pt ? "Cancelar" : "Cancel"}
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
              {pt ? "Agendar" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
