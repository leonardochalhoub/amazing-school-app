"use client";

import { useState, useTransition } from "react";
import { BookOpen, GraduationCap, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/context";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";
import type { MusicMeta } from "@/lib/content/music";
import { toMusicSlug } from "@/lib/content/music";
import { assignLesson } from "@/lib/actions/assignments";

type TargetType = "classroom" | "student";

interface Classroom {
  id: string;
  name: string;
}
interface Student {
  id: string;
  fullName: string;
  classroomId: string | null;
}

interface Props {
  lessons: LessonDraftMeta[];
  musics?: MusicMeta[];
  classrooms: Classroom[];
  students: Student[];
  label?: string;
  variant?: "primary" | "subtle";
}

export function AssignLessonButton({
  lessons,
  musics = [],
  classrooms,
  students,
  label,
  variant = "primary",
}: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [lessonSlug, setLessonSlug] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("classroom");
  const [classroomId, setClassroomId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();

  const t = locale === "pt-BR"
    ? {
        trigger: label ?? "Atribuir lição",
        title: "Atribuir uma lição",
        description: "Escolha a lição ou música e quem vai recebê-la.",
        lesson: "Lição ou música",
        pickLesson: "Selecione uma lição",
        lessonsGroup: "Lições",
        musicsGroup: "Músicas",
        target: "Atribuir a",
        targetClassroom: "Turma inteira",
        targetStudent: "Aluno específico",
        pickClassroom: "Selecione uma turma",
        pickStudent: "Selecione um aluno",
        cancel: "Cancelar",
        assign: "Atribuir",
        assigning: "Atribuindo…",
        success: "Atribuído",
        emptyLessons: "Nenhuma lição ou música publicada ainda.",
        emptyTargets: "Crie uma turma ou adicione um aluno primeiro.",
      }
    : {
        trigger: label ?? "Assign lesson",
        title: "Assign a lesson",
        description: "Choose a lesson or song and who should receive it.",
        lesson: "Lesson or song",
        pickLesson: "Pick a lesson",
        lessonsGroup: "Lessons",
        musicsGroup: "Songs",
        target: "Assign to",
        targetClassroom: "Whole classroom",
        targetStudent: "Specific student",
        pickClassroom: "Pick a classroom",
        pickStudent: "Pick a student",
        cancel: "Cancel",
        assign: "Assign",
        assigning: "Assigning…",
        success: "Assigned",
        emptyLessons: "No published lessons or songs yet.",
        emptyTargets: "Create a classroom or add a student first.",
      };

  function reset() {
    setLessonSlug("");
    setTargetType("classroom");
    setClassroomId("");
    setStudentId("");
  }

  function onTargetChange(next: TargetType) {
    setTargetType(next);
    setClassroomId("");
    setStudentId("");
  }

  function submit() {
    if (!lessonSlug || lessonSlug.trim() === "") {
      toast.error(t.pickLesson);
      return;
    }
    if (targetType === "classroom" && (!classroomId || classroomId.trim() === "")) {
      toast.error(t.pickClassroom);
      return;
    }
    if (targetType === "student" && (!studentId || studentId.trim() === "")) {
      toast.error(t.pickStudent);
      return;
    }

    let finalClassroomId: string | null = null;
    let finalRosterStudentId: string | null = null;
    if (targetType === "classroom") {
      finalClassroomId = classroomId;
    } else {
      const student = students.find((s) => s.id === studentId);
      finalRosterStudentId = studentId;
      // Inherit the student's classroom when they have one so the lesson
      // still shows in classroom-level views. For students without a
      // classroom, we send the assignment with classroom_id=null — the
      // 023 migration allows it as long as roster_student_id is set.
      finalClassroomId = student?.classroomId ?? null;
    }

    startTransition(async () => {
      const result = await assignLesson({
        classroomId: finalClassroomId,
        lessonSlug,
        rosterStudentId: finalRosterStudentId,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.success);
        setOpen(false);
        reset();
      }
    });
  }

  const publishedLessons = lessons.filter((l) => l.published);
  const hasAnyItem = publishedLessons.length > 0 || musics.length > 0;

  return (
    <>
      <Button
        size="sm"
        variant={variant === "primary" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <BookOpen className="h-4 w-4" />
        {t.trigger}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>

          {!hasAnyItem ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {t.emptyLessons}
            </p>
          ) : classrooms.length === 0 && students.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {t.emptyTargets}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.lesson}
                </label>
                <select
                  value={lessonSlug}
                  onChange={(e) => setLessonSlug(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">{t.pickLesson}</option>
                  {publishedLessons.length > 0 ? (
                    <optgroup label={t.lessonsGroup}>
                      {publishedLessons.map((l) => (
                        <option key={l.slug} value={l.slug}>
                          {l.cefr_level.toUpperCase()} · {l.category} · {l.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {musics.length > 0 ? (
                    <optgroup label={`🎵 ${t.musicsGroup}`}>
                      {musics.map((m) => (
                        <option key={m.slug} value={toMusicSlug(m.slug)}>
                          {m.cefr_level.toUpperCase()} · {m.artist} — {m.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.target}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onTargetChange("classroom")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      targetType === "classroom"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t.targetClassroom}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTargetChange("student")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      targetType === "student"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    {t.targetStudent}
                  </button>
                </div>
              </div>

              {targetType === "classroom" ? (
                <div className="space-y-1.5">
                  <select
                    value={classroomId}
                    onChange={(e) => setClassroomId(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t.pickClassroom}</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t.pickStudent}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                        {s.classroomId
                          ? ""
                          : locale === "pt-BR"
                            ? " (sem turma)"
                            : " (no classroom)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !hasAnyItem}
            >
              {pending ? t.assigning : t.assign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
