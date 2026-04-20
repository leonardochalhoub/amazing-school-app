import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Até logo · See you later",
  robots: { index: false, follow: false },
};

/**
 * Warm landing for students whose teacher has soft-deleted their
 * roster row. Their auth account still exists (so they can
 * re-sign-up under a new teacher later), but they can't reach the
 * student dashboard — the dashboard layout redirects them here.
 *
 * Copy is bilingual, gentle, and makes clear the action came from
 * the teacher, not from the platform.
 */
export default function RemovedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-rose-50 to-amber-50 dark:from-indigo-950/40 dark:via-rose-950/30 dark:to-amber-950/20">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
        <div
          aria-hidden
          className="mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400/80 via-rose-400/70 to-amber-400/80 text-[88px] shadow-xl"
        >
          👋
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold italic tracking-tight text-foreground sm:text-5xl">
          <span className="bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            Até logo!
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Sua professora te tirou da lista de alunos. Se isso foi um
          engano, fale com ela para te adicionar de volta — seu
          progresso e suas aulas continuam guardados.
        </p>

        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your teacher has removed you from the student list. If this
          was by mistake, just ask them to add you back — your
          lessons and progress are safe with us.
        </p>
      </div>
    </div>
  );
}
