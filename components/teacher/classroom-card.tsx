"use client";

import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface ClassroomCardProps {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  studentCount: number;
  accentIndex?: number;
}

const ICON_GRADIENTS = [
  "from-indigo-500 via-violet-500 to-pink-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-sky-500 via-blue-500 to-indigo-500",
  "from-pink-500 via-rose-500 to-orange-500",
];

export function ClassroomCard({
  id,
  name,
  inviteCode,
  studentCount,
  accentIndex = 0,
}: ClassroomCardProps) {
  const { locale } = useI18n();
  const gradient = ICON_GRADIENTS[accentIndex % ICON_GRADIENTS.length];
  const studentsLabel =
    locale === "pt-BR"
      ? studentCount === 1
        ? "aluno"
        : "alunos"
      : studentCount === 1
        ? "student"
        : "students";

  return (
    <Link href={`/teacher/classroom/${id}`} className="group block w-full">
      <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div className="relative">
          <div
            className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-60`}
            aria-hidden
          />
          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md ring-1 ring-black/10 dark:ring-white/10`}
          >
            <GraduationCap className="h-9 w-9" />
          </div>
        </div>
        <div className="relative min-w-0 w-full text-center">
          <p className="truncate text-sm font-semibold leading-tight">{name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {studentCount} {studentsLabel} ·{" "}
            <span className="font-mono">{inviteCode}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

interface AddClassroomCardProps {
  href?: string;
}

export function AddClassroomCard({
  href = "/teacher/classroom/new",
}: AddClassroomCardProps) {
  const { locale } = useI18n();
  const label = locale === "pt-BR" ? "Nova turma" : "New classroom";

  return (
    <Link
      href={href}
      className="group relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-card hover:text-primary hover:shadow-lg"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted transition-all duration-300 group-hover:rotate-90 group-hover:bg-primary/10">
        <Plus className="h-9 w-9" />
      </span>
      <span className="relative text-sm font-medium">{label}</span>
    </Link>
  );
}
