"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function AddClassroomButton() {
  const { locale } = useI18n();
  const label = locale === "pt-BR" ? "Nova turma" : "New classroom";

  return (
    <Link
      href="/teacher/classroom/new"
      className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 text-xs font-semibold text-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md hover:brightness-110 dark:ring-white/10"
    >
      <GraduationCap className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
