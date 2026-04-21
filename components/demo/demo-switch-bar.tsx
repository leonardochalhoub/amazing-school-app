"use client";

import { ArrowRightLeft, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  currentRole: "teacher" | "student";
};

/**
 * Persistent banner that appears on every demo-account page. Explains
 * that the visitor is in the live demo and lets them jump to the other
 * persona with a single click — the API route signs out and signs into
 * the opposite demo account in the same tab.
 */
export function DemoSwitchBar({ currentRole }: Props) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const target = currentRole === "teacher" ? "student" : "teacher";

  const message = isPt
    ? currentRole === "teacher"
      ? "Você está na demonstração da Amazing School como professora. Todos os alunos, aulas e pagamentos são fictícios — é seguro clicar em tudo. Veja também o lado do aluno:"
      : "Você está na demonstração da Amazing School como aluna. Todos os dados são fictícios — nada que você fizer aqui afeta contas reais. Veja também o lado da professora:"
    : currentRole === "teacher"
      ? "You're in the Amazing School demo as a teacher. Every student, class, and payment is fake — it's safe to click anything. See the student side too:"
      : "You're in the Amazing School demo as a student. Every piece of data is fake — nothing you do here affects real accounts. See the teacher side too:";

  const switchLabel = isPt
    ? currentRole === "teacher"
      ? "Entrar como aluna"
      : "Entrar como professora"
    : currentRole === "teacher"
      ? "Switch to student view"
      : "Switch to teacher view";

  const exitLabel = isPt ? "Sair e criar conta" : "Exit & create account";

  return (
    <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/95 via-orange-500/95 to-rose-500/95 text-white shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {isPt ? "Demo ao vivo" : "Live demo"}
        </span>
        <p className="flex-1 text-xs font-medium leading-snug sm:text-sm">
          {message}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <form action="/api/demo-login" method="POST">
            <input type="hidden" name="kind" value={target} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-white hover:shadow-md"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {switchLabel}
            </button>
          </form>
          <form action="/api/demo-signout?to=/" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/25"
            >
              <LogOut className="h-3.5 w-3.5" />
              {exitLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
