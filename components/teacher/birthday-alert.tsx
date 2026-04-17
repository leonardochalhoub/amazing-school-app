"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Cake, X, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { CartoonAvatar } from "@/components/shared/cartoon-avatar";
import type { UpcomingBirthday } from "@/lib/actions/birthdays";

interface Props {
  birthdays: UpcomingBirthday[];
}

/**
 * Dismissible popup banner listing students with upcoming birthdays.
 * Dismissal persists for ~12 hours via localStorage, then reappears.
 */
export function BirthdayAlert({ birthdays }: Props) {
  const { locale } = useI18n();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  const storageKey = `birthday-alert-dismissed-v1`;
  const ttlMs = 12 * 60 * 60 * 1000;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      if (Number.isFinite(ts) && Date.now() - ts < ttlMs) setDismissed(true);
      else setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, [storageKey, ttlMs]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {}
  }

  if (dismissed === null) return null;
  if (dismissed) return null;
  if (birthdays.length === 0) return null;

  const t = locale === "pt-BR"
    ? {
        heading: "Aniversários próximos",
        today: "Hoje",
        tomorrow: "Amanhã",
        inDays: (n: number) => `em ${n} dias`,
        turning: (n: number) => `fazendo ${n}`,
        viewStudent: "Ver aluno",
        dismiss: "Dispensar",
      }
    : {
        heading: "Upcoming birthdays",
        today: "Today",
        tomorrow: "Tomorrow",
        inDays: (n: number) => `in ${n} days`,
        turning: (n: number) => `turning ${n}`,
        viewStudent: "Open student",
        dismiss: "Dismiss",
      };

  const dateFmt = new Intl.DateTimeFormat(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    { month: "short", day: "numeric" }
  );

  return (
    <section
      role="status"
      className="relative overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 p-5 shadow-sm dark:border-pink-900/50 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-amber-950/30"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-300/30 blur-2xl"
      />
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.dismiss}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-muted-foreground backdrop-blur transition-colors hover:bg-white hover:text-foreground dark:bg-black/30 dark:hover:bg-black/50"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex flex-wrap items-start gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-sm">
          <Cake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            {t.heading}
            <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:bg-black/30 dark:text-pink-300">
              {birthdays.length}
            </span>
          </p>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {birthdays.slice(0, 6).map((b) => {
              const relative =
                b.daysUntil === 0
                  ? t.today
                  : b.daysUntil === 1
                    ? t.tomorrow
                    : t.inDays(b.daysUntil);
              return (
                <li key={b.id}>
                  <Link
                    href={`/teacher/students/${b.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-border/60 bg-white/70 p-2 transition-colors hover:border-pink-400 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40"
                  >
                    <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted ring-2 ring-white dark:ring-black/30">
                      {b.avatarUrl ? (
                        <Image
                          src={b.avatarUrl}
                          alt={b.fullName}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <CartoonAvatar
                          ageGroup={b.ageGroup}
                          gender={b.gender}
                          seed={b.id}
                          fullName={b.fullName}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {b.fullName}
                      </p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">
                        {relative} · {dateFmt.format(new Date(b.nextBirthdayDate))}
                        {b.turningAge ? ` · ${t.turning(b.turningAge)}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
