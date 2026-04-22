"use client";

import Link from "next/link";
import { BookOpen, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  current: "lessons" | "exercises";
}

export function BankTabs({ current }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  return (
    <nav className="flex items-center gap-1 rounded-full border border-border bg-background p-1 w-max">
      <Link
        href="/teacher/bank?view=lessons"
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium ${
          current === "lessons"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <BookOpen className="h-3.5 w-3.5" />
        {pt ? "Banco de lições" : "Lesson bank"}
      </Link>
      <Link
        href="/teacher/bank?view=exercises"
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium ${
          current === "exercises"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        {pt ? "Banco de exercícios" : "Exercise bank"}
      </Link>
    </nav>
  );
}
