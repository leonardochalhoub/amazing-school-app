"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GhostInput } from "@/components/ui/ghost-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createRosterStudent } from "@/lib/actions/roster";
import { createClassroomQuick } from "@/lib/actions/classroom";
import { useI18n } from "@/lib/i18n/context";

interface Classroom {
  id: string;
  name: string;
}

interface Props {
  classrooms: Classroom[];
  variant?: "card" | "button";
}

const NEW_CLASSROOM_OPTION = "__new__";

const STRINGS = {
  en: {
    addStudent: "Add student",
    dialogTitle: "Add a student",
    dialogDescription:
      "Add a student to your roster. Assign them to an existing classroom or create a new one right here.",
    fullName: "Full name",
    fullNamePlaceholder: "Maria Silva",
    emailOptional: "Email (optional)",
    classroom: "Classroom",
    noClassroom: "No classroom",
    createNewClassroom: "+ Create new classroom…",
    newClassroomName: "New classroom name",
    newClassroomPlaceholder: "e.g. Monday Morning A1",
    cancel: "Cancel",
    adding: "Adding…",
    enterClassroomName: "Enter a classroom name",
    classroomCreated: (name: string) => `Classroom "${name}" created`,
    studentAdded: "Student added",
  },
  "pt-BR": {
    addStudent: "Adicionar aluno",
    dialogTitle: "Adicionar um aluno",
    dialogDescription:
      "Adicione um aluno à sua lista. Associe a uma turma existente ou crie uma nova aqui mesmo.",
    fullName: "Nome completo",
    fullNamePlaceholder: "Maria Silva",
    emailOptional: "Email (opcional)",
    classroom: "Turma",
    noClassroom: "Sem turma",
    createNewClassroom: "+ Criar nova turma…",
    newClassroomName: "Nome da nova turma",
    newClassroomPlaceholder: "ex. Segunda de manhã A1",
    cancel: "Cancelar",
    adding: "Adicionando…",
    enterClassroomName: "Digite um nome para a turma",
    classroomCreated: (name: string) => `Turma "${name}" criada`,
    studentAdded: "Aluno adicionado",
  },
} as const;

export function AddStudentButton({
  classrooms: initialClassrooms,
  variant = "button",
}: Props) {
  const { locale } = useI18n();
  const t = locale === "pt-BR" ? STRINGS["pt-BR"] : STRINGS.en;

  const [open, setOpen] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [showNewClassroom, setShowNewClassroom] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState("");
  const [ageGroup, setAgeGroup] = useState<"kid" | "teen" | "adult" | "">("");
  const [gender, setGender] = useState<"female" | "male" | "">("");
  const [birthday, setBirthday] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setFullName("");
    setPreferredName("");
    setEmail("");
    setClassroomId("");
    setShowNewClassroom(false);
    setNewClassroomName("");
    setAgeGroup("");
    setGender("");
    setBirthday("");
  }

  function onClassroomChange(value: string) {
    if (value === NEW_CLASSROOM_OPTION) {
      setShowNewClassroom(true);
      setClassroomId("");
    } else {
      setShowNewClassroom(false);
      setNewClassroomName("");
      setClassroomId(value);
    }
  }

  async function ensureClassroom(): Promise<string | null | "abort"> {
    if (!showNewClassroom) return classroomId || null;
    const name = newClassroomName.trim();
    if (name.length === 0) {
      toast.error(t.enterClassroomName);
      return "abort";
    }
    const result = await createClassroomQuick({ name });
    if ("error" in result && result.error) {
      toast.error(result.error);
      return "abort";
    }
    if ("id" in result && result.id && result.name) {
      const newClassroom: Classroom = { id: result.id, name: result.name };
      setClassrooms((prev) => [newClassroom, ...prev]);
      toast.success(t.classroomCreated(result.name));
      return result.id;
    }
    return null;
  }

  function submit() {
    if (fullName.trim().length === 0) return;
    startTransition(async () => {
      const targetClassroom = await ensureClassroom();
      if (targetClassroom === "abort") return;

      const result = await createRosterStudent({
        fullName: fullName.trim(),
        preferredName: preferredName.trim() || undefined,
        email: email.trim() || undefined,
        classroomId: targetClassroom || null,
        ageGroup: ageGroup || undefined,
        gender: gender || undefined,
        birthday: birthday || undefined,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("id" in result) {
        toast.success(t.studentAdded);
        setOpen(false);
        reset();
        router.push(`/teacher/students/${result.id}`);
      }
    });
  }

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/40 p-4 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-card hover:text-primary hover:shadow-lg"
        >
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted transition-all duration-300 group-hover:rotate-90 group-hover:bg-primary/10">
            <Plus className="h-9 w-9" />
          </span>
          <span className="text-sm font-medium">{t.addStudent}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-xs font-semibold text-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md hover:brightness-110 dark:ring-white/10"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {t.addStudent}
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rs-name">
                {t.fullName}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">
                  {locale === "pt-BR"
                    ? "· Tab aceita a sugestão"
                    : "· Tab to accept suggestion"}
                </span>
              </Label>
              <GhostInput
                id="rs-name"
                value={fullName}
                onValueChange={setFullName}
                suggestion={t.fullNamePlaceholder}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-preferred">
                {locale === "pt-BR"
                  ? "Como prefere ser chamado? (opcional)"
                  : "How they'd like to be called (optional)"}
              </Label>
              <GhostInput
                id="rs-preferred"
                value={preferredName}
                onValueChange={setPreferredName}
                suggestion={locale === "pt-BR" ? "Mari" : "Mari"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-birthday">
                {locale === "pt-BR" ? "Aniversário (opcional)" : "Birthday (optional)"}
              </Label>
              <Input
                id="rs-birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-email">{t.emailOptional}</Label>
              <GhostInput
                id="rs-email"
                type="email"
                value={email}
                onValueChange={setEmail}
                suggestion="maria@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  {locale === "pt-BR" ? "Faixa etária" : "Age group"}
                </Label>
                <div className="flex gap-1">
                  {(["kid", "teen", "adult"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAgeGroup(opt)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        ageGroup === opt
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {locale === "pt-BR"
                        ? opt === "kid"
                          ? "Criança"
                          : opt === "teen"
                            ? "Adolescente"
                            : "Adulto"
                        : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {locale === "pt-BR" ? "Gênero" : "Gender"}
                </Label>
                <div className="flex gap-1">
                  {(["female", "male"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setGender(opt)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        gender === opt
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {locale === "pt-BR"
                        ? opt === "female"
                          ? "Feminino"
                          : "Masculino"
                        : opt === "female"
                          ? "Female"
                          : "Male"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-classroom">{t.classroom}</Label>
              <select
                id="rs-classroom"
                value={showNewClassroom ? NEW_CLASSROOM_OPTION : classroomId}
                onChange={(e) => onClassroomChange(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">{t.noClassroom}</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CLASSROOM_OPTION}>
                  {t.createNewClassroom}
                </option>
              </select>
              {showNewClassroom ? (
                <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                  <Label
                    htmlFor="rs-new-class"
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {t.newClassroomName}
                    </span>
                  </Label>
                  <GhostInput
                    id="rs-new-class"
                    value={newClassroomName}
                    onValueChange={setNewClassroomName}
                    suggestion={t.newClassroomPlaceholder}
                    className="mt-1"
                  />
                </div>
              ) : null}
            </div>
          </div>
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
              disabled={
                pending ||
                fullName.trim().length === 0 ||
                (showNewClassroom && newClassroomName.trim().length === 0)
              }
            >
              {pending ? t.adding : t.addStudent}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
