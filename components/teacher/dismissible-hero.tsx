"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { HeroTagline } from "@/components/teacher/hero-tagline";
import { AddStudentButton } from "@/components/teacher/add-student-button";
import { CuteFlourish } from "@/components/teacher/cute-flourish";
import { ClockWeatherCard } from "@/components/shared/clock-weather-card";

const STORAGE_KEY = "teacher-hero-dismissed";

interface Props {
  firstName: string;
  classrooms: { id: string; name: string }[];
  /** Explicit profiles.gender passed through from the server. Null =
   *  masculine pt-BR copy. No name-based inference. */
  gender?: "female" | "male" | null;
  /** City label + coordinates for the embedded clock/weather readout.
   *  Null on all three = clock only, no weather. */
  locationLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function DismissibleHero({
  firstName,
  classrooms,
  gender,
  locationLabel,
  lat,
  lng,
}: Props) {
  const { locale } = useI18n();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }

  function restore() {
    setDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  if (dismissed === null) return null;

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={restore}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      >
        <Sparkles className="h-3 w-3" />
        {locale === "pt-BR" ? "Mostrar saudação" : "Show welcome"}
      </button>
    );
  }

  const isFemale = gender === "female";
  const kicker =
    locale === "pt-BR"
      ? isFemale
        ? "Painel da professora"
        : "Painel do professor"
      : "Teacher dashboard";
  const closeLabel = locale === "pt-BR" ? "Fechar saudação" : "Dismiss welcome";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted/30 px-6 py-8 md:px-10 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-pink-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-sky-500/20 blur-3xl"
      />

      {/* Bouquet flourish — female teachers only. Tucked into the
          empty space on the right of the hero above the dismiss
          button; hidden on narrow screens so the title never
          wraps around it. */}
      {isFemale ? (
        <CuteFlourish
          size={170}
          className="pointer-events-none absolute right-4 bottom-4 hidden opacity-80 md:block"
        />
      ) : null}

      <button
        type="button"
        onClick={dismiss}
        aria-label={closeLabel}
        title={closeLabel}
        className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          {kicker}
        </div>

        <HeroTagline firstName={firstName} gender={gender} />

        {/* Inline clock + weather — a subtle divider above keeps it
            feeling like its own readout rather than a stray line of
            metadata. Sits between the tagline and the primary CTA. */}
        <div className="mt-6 border-t border-border/60 pt-5">
          <ClockWeatherCard label={locationLabel} lat={lat} lng={lng} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <AddStudentButton classrooms={classrooms} />
        </div>
      </div>
    </section>
  );
}
