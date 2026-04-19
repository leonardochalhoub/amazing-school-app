"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import {
  updateRosterStudent,
  deleteRosterStudent,
} from "@/lib/actions/roster";
import { createClassroomQuick } from "@/lib/actions/classroom";
import { useI18n } from "@/lib/i18n/context";

type AgeGroup = "kid" | "teen" | "adult";
type Gender = "female" | "male";
type Level = "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "y4";
const LEVEL_OPTIONS: readonly Level[] = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
  "y4",
] as const;

interface Props {
  rosterId: string;
  fullName: string;
  preferredName: string | null;
  email: string | null;
  classroomId: string | null;
  notes: string | null;
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  birthday: string | null;
  level: Level | null;
  /** ISO "YYYY-MM-DD", read-only display (date the teacher enrolled them). */
  startingOn: string | null;
  /** ISO "YYYY-MM-DD", editable — when the student stopped studying. */
  endedOn: string | null;
  hasAvatar: boolean;
  classrooms: { id: string; name: string }[];
}

export function RosterEditForm({
  rosterId,
  fullName,
  preferredName,
  email,
  classroomId,
  notes,
  ageGroup,
  gender,
  birthday,
  level,
  startingOn,
  endedOn,
  hasAvatar,
  classrooms,
}: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const [name, setName] = useState(fullName);
  const [preferred, setPreferred] = useState(preferredName ?? "");
  const [emailValue, setEmailValue] = useState(email ?? "");
  const [classId, setClassId] = useState(classroomId ?? "");
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [ageGroupValue, setAgeGroupValue] = useState<AgeGroup | "">(
    ageGroup ?? ""
  );
  const [genderValue, setGenderValue] = useState<Gender | "">(gender ?? "");
  const [birthdayValue, setBirthdayValue] = useState<string>(birthday ?? "");
  const [levelValue, setLevelValue] = useState<Level | "">(level ?? "");
  const [endedOnValue, setEndedOnValue] = useState<string>(endedOn ?? "");
  const [startingOnValue, setStartingOnValue] = useState<string>(
    // Normalize whatever came in (ISO date OR full timestamp) to yyyy-MM-dd
    (startingOn ?? "").slice(0, 10),
  );
  const [classroomOptions, setClassroomOptions] = useState(classrooms);
  const [pending, startTransition] = useTransition();

  const t = locale === "pt-BR"
    ? {
        fullName: "Nome completo",
        preferred: "Como prefere ser chamado",
        email: "Email",
        classroom: "Turma",
        noClassroom: "Sem turma",
        notes: "Anotações",
        ageGroup: "Faixa etária",
        gender: "Gênero",
        kid: "Criança",
        teen: "Adolescente",
        adult: "Adulto",
        female: "Feminino",
        male: "Masculino",
        preview: "Pré-visualização do avatar",
        previewHint:
          "Se o aluno não tiver foto, este desenho aparece automaticamente.",
        save: "Salvar alterações",
        saving: "Salvando…",
        saved: "Salvo",
        removeStudent: "Apagar aluno",
        confirmDelete: (n: string) =>
          `Apagar ${n} da sua lista? Isso não pode ser desfeito.`,
        removed: "Aluno apagado",
        none: "Sem definição",
      }
    : {
        fullName: "Full name",
        preferred: "How they'd like to be called",
        email: "Email",
        classroom: "Classroom",
        noClassroom: "No classroom",
        notes: "Notes",
        ageGroup: "Age group",
        gender: "Gender",
        kid: "Kid",
        teen: "Teen",
        adult: "Adult",
        female: "Female",
        male: "Male",
        preview: "Avatar preview",
        previewHint:
          "If the student has no photo, this cartoon shows up automatically.",
        save: "Save changes",
        saving: "Saving…",
        saved: "Saved",
        removeStudent: "Delete student",
        confirmDelete: (n: string) =>
          `Delete ${n} from your roster? This cannot be undone.`,
        removed: "Student deleted",
        none: "Unset",
      };

  function save() {
    if (name.trim().length === 0) return;
    startTransition(async () => {
      const result = await updateRosterStudent({
        id: rosterId,
        fullName: name.trim(),
        preferredName: preferred.trim() || null,
        email: emailValue.trim() || null,
        classroomId: classId || null,
        notes: notesValue.trim() || null,
        ageGroup: ageGroupValue || null,
        gender: genderValue || null,
        birthday: birthdayValue || null,
        level: levelValue || null,
        endedOn: endedOnValue || null,
        billingStartsOn: startingOnValue || null,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.saved);
        router.refresh();
      }
    });
  }

  function createClassroomInline() {
    const name = window.prompt(
      locale === "pt-BR"
        ? "Nome da nova turma"
        : "Name of the new classroom",
    );
    const trimmed = name?.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createClassroomQuick({ name: trimmed });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setClassroomOptions((prev) => [...prev, { id: res.id, name: res.name }]);
      setClassId(res.id);
      toast.success(
        locale === "pt-BR" ? "Turma criada" : "Classroom created",
      );
    });
  }

  function remove() {
    if (!confirm(t.confirmDelete(fullName))) return;
    startTransition(async () => {
      const result = await deleteRosterStudent({ id: rosterId });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.removed);
        router.push("/teacher");
      }
    });
  }

  const ageLabels: Record<AgeGroup, string> = {
    kid: t.kid,
    teen: t.teen,
    adult: t.adult,
  };
  const genderLabels: Record<Gender, string> = {
    female: t.female,
    male: t.male,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rs-name">{t.fullName}</Label>
          <Input
            id="rs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-preferred">{t.preferred}</Label>
          <Input
            id="rs-preferred"
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            placeholder={locale === "pt-BR" ? "Mari" : "Mari"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rs-email">{t.email}</Label>
          <Input
            id="rs-email"
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-class">{t.classroom}</Label>
          <div className="flex gap-1.5">
            <select
              id="rs-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">{t.noClassroom}</option>
              {classroomOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createClassroomInline}
              disabled={pending}
              aria-label={
                locale === "pt-BR" ? "Nova turma" : "New classroom"
              }
              title={
                locale === "pt-BR" ? "Nova turma" : "New classroom"
              }
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-birthday">
            {locale === "pt-BR" ? "Aniversário" : "Birthday"}
          </Label>
          <Input
            id="rs-birthday"
            type="date"
            value={birthdayValue}
            onChange={(e) => setBirthdayValue(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rs-starting-on">
            {locale === "pt-BR" ? "Data de início" : "Starting date"}
          </Label>
          <Input
            id="rs-starting-on"
            type="date"
            value={startingOnValue}
            onChange={(e) => setStartingOnValue(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            {locale === "pt-BR"
              ? "Primeiro mês que o aluno pode ser cobrado. Ajuste se as aulas começaram antes do cadastro."
              : "First month the student can be billed. Set it earlier if classes started before you enrolled them."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-ended-on">
            {locale === "pt-BR" ? "Último dia" : "Last day"}
          </Label>
          <Input
            id="rs-ended-on"
            type="date"
            value={endedOnValue}
            onChange={(e) => setEndedOnValue(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            {locale === "pt-BR"
              ? "Deixe em branco enquanto o aluno continua ativo. Marque quando as aulas terminarem — a matriz de mensalidade trava as células posteriores."
              : "Leave blank while the student is active. Set it when classes finish — the tuition matrix locks cells after it."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.preview}
          </Label>
          <div
            className={`relative h-24 w-24 overflow-hidden rounded-full p-[3px] shadow-md ${
              hasAvatar
                ? "bg-muted opacity-60"
                : "bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500"
            }`}
          >
            <div className="h-full w-full overflow-hidden rounded-full bg-card">
              <CartoonAvatar
                ageGroup={ageGroupValue || null}
                gender={genderValue || null}
                seed={rosterId}
                fullName={name}
              />
            </div>
          </div>
          <p className="max-w-[160px] text-[10px] text-muted-foreground">
            {hasAvatar
              ? locale === "pt-BR"
                ? "Foto real em uso — o desenho é apenas pré-visualização."
                : "Real photo in use — the cartoon is just a preview."
              : t.previewHint}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.ageGroup}</Label>
            <div className="flex gap-1.5">
              {(["kid", "teen", "adult"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAgeGroupValue(opt)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ageGroupValue === opt
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {ageLabels[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.gender}</Label>
            <div className="flex gap-1.5">
              {(["female", "male"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGenderValue(opt)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    genderValue === opt
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {genderLabels[opt]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {locale === "pt-BR" ? "Nível CEFR" : "CEFR level"}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLevelValue("")}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  levelValue === ""
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40"
                }`}
              >
                {locale === "pt-BR" ? "—" : "—"}
              </button>
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLevelValue(opt)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium uppercase transition-colors ${
                    levelValue === opt
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rs-notes">{t.notes}</Label>
        <textarea
          id="rs-notes"
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          placeholder={
            locale === "pt-BR"
              ? "Anotações privadas sobre este aluno…"
              : "Private notes about this student…"
          }
          maxLength={2000}
          className="min-h-[100px] w-full rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          variant="outline"
          onClick={remove}
          disabled={pending}
          className="gap-1.5 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          {t.removeStudent}
        </Button>
        <Button onClick={save} disabled={pending || name.trim().length === 0}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
