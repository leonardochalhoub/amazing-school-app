"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  DATE_PREFIX,
  DATE_SUFFIX,
  formatToday,
  pickMessage,
} from "@/lib/i18n/greetings";

interface Props {
  firstName: string;
  /** Explicit profiles.gender. Drives the pt-BR "Bem-vinda" /
   *  "professora" switch. English only has a single "teacher" so
   *  it's ignored there. Null = fall back to masculine. */
  gender?: "female" | "male" | null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HeroTagline({ firstName, gender }: Props) {
  const { locale } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isFemale = gender === "female";

  const welcome =
    locale === "pt-BR"
      ? isFemale
        ? "Bem-vinda de volta"
        : "Bem-vindo de volta"
      : "Welcome back";
  const roleLabel =
    locale === "pt-BR"
      ? isFemale
        ? "professora"
        : "professor"
      : "teacher";
  const subtitle =
    locale === "pt-BR"
      ? "Gerencie seus alunos e turmas. Clique em qualquer quadrado para ver detalhes — adicionar, editar cadastros, enviar fotos e acompanhar o progresso."
      : "Manage your students and classrooms. Click any square to dive into details — add new, edit rosters, upload photos, track progress.";

  const dateLine = now
    ? `${DATE_PREFIX[locale]} ${capitalize(formatToday(locale, now))}${DATE_SUFFIX[locale]}`
    : "";
  const message = now
    ? pickMessage(
        locale,
        now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate()
      )
    : "";

  return (
    <>
      <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
        {welcome},{" "}
        <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
          {roleLabel} {firstName}
        </span>
        !
      </h1>
      {dateLine ? (
        <p className="mt-2 text-sm font-medium text-muted-foreground" suppressHydrationWarning>
          {dateLine}
        </p>
      ) : null}
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
        <span className="font-semibold text-foreground" suppressHydrationWarning>
          {message}
        </span>
        {message ? " " : ""}
        {subtitle}
      </p>
    </>
  );
}
