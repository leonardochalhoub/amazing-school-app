"use client";

import { useI18n } from "@/lib/i18n/context";

const DICT = {
  kicker: { en: "Teacher dashboard", pt: "Painel do professor" },
  students: { en: "Students", pt: "Alunos" },
  classrooms: { en: "Classrooms", pt: "Turmas" },
  addStudent: { en: "Add student", pt: "Adicionar aluno" },
  newClassroom: { en: "New classroom", pt: "Nova turma" },
  addNew: { en: "Add new", pt: "Adicionar" },
} as const;

type Key = keyof typeof DICT;

export function TeacherSectionLabels({ keyName }: { keyName: Key }) {
  const { locale } = useI18n();
  return <>{locale === "pt-BR" ? DICT[keyName].pt : DICT[keyName].en}</>;
}

export function TeacherI18nClient({
  en,
  pt,
}: {
  en: string;
  pt: string;
}) {
  const { locale } = useI18n();
  return <>{locale === "pt-BR" ? pt : en}</>;
}
