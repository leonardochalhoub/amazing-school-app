"use client";

import { useMemo, useState } from "react";
import { Lock, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  BADGE_DEFINITIONS,
  badgesForAudience,
  type BadgeDefinition,
  type BadgeTier,
  type BadgeTheme,
} from "@/lib/gamification/config";
import type { BadgeProgress } from "@/lib/actions/badge-progress";

interface Props {
  audience: "student" | "teacher";
  progress: BadgeProgress;
}

const TIER_ORDER: BadgeTier[] = [
  "easy",
  "medium",
  "medium_plus",
  "hard",
  "very_hard",
];
const TIER_LABEL_EN: Record<BadgeTier, string> = {
  easy: "Easy",
  medium: "Medium",
  medium_plus: "Medium+",
  hard: "Hard",
  very_hard: "Very Hard",
};
const TIER_LABEL_PT: Record<BadgeTier, string> = {
  easy: "Fácil",
  medium: "Médio",
  medium_plus: "Médio+",
  hard: "Difícil",
  very_hard: "Muito Difícil",
};

const THEME_ORDER: BadgeTheme[] = [
  "milestones",
  "streaks",
  "levels",
  "real_hours",
  "music",
  "speaking",
  "chat",
  "profile",
  "teacher_legacy",
  "teacher_artisan",
  "cefr",
  "easter_eggs",
];
const THEME_LABEL_EN: Record<BadgeTheme, string> = {
  milestones: "Milestones",
  streaks: "Streaks",
  levels: "Levels",
  real_hours: "Real Hours",
  music: "Music",
  speaking: "Speaking",
  chat: "AI Chat",
  profile: "Profile",
  teacher_legacy: "Teacher Legacy",
  teacher_artisan: "Teacher Artisan",
  cefr: "CEFR Certificates",
  easter_eggs: "Easter Eggs",
};
const THEME_LABEL_PT: Record<BadgeTheme, string> = {
  milestones: "Marcos",
  streaks: "Sequências",
  levels: "Níveis",
  real_hours: "Horas Reais",
  music: "Música",
  speaking: "Fala",
  chat: "IA · Conversa",
  profile: "Perfil",
  teacher_legacy: "Legado de Professor",
  teacher_artisan: "Professor Artesão",
  cefr: "Certificados CEFR",
  easter_eggs: "Easter Eggs",
};

/** Current progress metric (value, threshold) for this badge, if applicable. */
function progressForBadge(
  def: BadgeDefinition,
  p: BadgeProgress,
): { value: number; threshold: number } | null {
  switch (def.unlock.kind) {
    case "streak":
      return { value: p.currentStreak, threshold: def.unlock.days };
    case "level":
      return { value: p.level, threshold: def.unlock.level };
    case "count": {
      const c = def.unlock.counter;
      const value =
        c === "lessons_completed" ? p.lessonsCompleted :
        c === "music_completed" ? p.musicCompleted :
        c === "conversations" ? p.conversations :
        c === "assignments_created" ? p.assignmentsCreated :
        c === "lessons_authored" ? p.lessonsAuthored :
        c === "classes_taught" ? p.classesTaught :
        c === "certificates_issued" ? p.certificatesIssued :
        c === "students_added" ? p.studentsAdded :
        c === "classrooms_created" ? p.classroomsCreated :
        c === "students_certified" ? p.studentsCertified :
        c === "mentor_grants" ? p.mentorGrants :
        0;
      return { value, threshold: def.unlock.threshold };
    }
    case "hours": {
      const s = def.unlock.source;
      const m =
        s === "live" ? p.liveMinutes :
        s === "lessons" ? p.lessonMinutes :
        s === "songs" ? p.songMinutes :
        s === "speaking" ? p.speakingMinutes :
        p.allMinutes;
      return { value: m / 60, threshold: def.unlock.hours };
    }
    default:
      return null;
  }
}

/**
 * Plain-language unlock description for the locked card back.
 */
function unlockText(def: BadgeDefinition, pt: boolean): string {
  const u = def.unlock;
  switch (u.kind) {
    case "auto":
      return pt ? "Automático" : "Automatic";
    case "level":
      return pt ? `Alcance o nível ${u.level}` : `Reach level ${u.level}`;
    case "streak":
      return pt ? `Sequência de ${u.days} dias` : `${u.days}-day streak`;
    case "count": {
      const noun =
        u.counter === "lessons_completed" ? (pt ? "lições" : "lessons") :
        u.counter === "music_completed" ? (pt ? "músicas" : "songs") :
        u.counter === "conversations" ? (pt ? "conversas com IA" : "AI conversations") :
        u.counter === "assignments_created" ? (pt ? "tarefas criadas" : "assignments created") :
        u.counter === "lessons_authored" ? (pt ? "lições publicadas" : "lessons authored") :
        u.counter === "classes_taught" ? (pt ? "aulas ministradas" : "classes taught") :
        u.counter === "certificates_issued" ? (pt ? "certificados emitidos" : "certificates issued") :
        u.counter === "students_added" ? (pt ? "alunos" : "students") :
        u.counter === "classrooms_created" ? (pt ? "turmas" : "classrooms") :
        u.counter === "students_certified" ? (pt ? "alunos certificados" : "students certified") :
        u.counter === "mentor_grants" ? (pt ? "créditos de mentor" : "mentor grants") :
        u.counter;
      return pt ? `${u.threshold} ${noun}` : `${u.threshold} ${noun}`;
    }
    case "hours": {
      const src =
        u.source === "live" ? (pt ? "em aulas ao vivo" : "of live classes") :
        u.source === "lessons" ? (pt ? "em lições" : "of lessons") :
        u.source === "songs" ? (pt ? "em músicas" : "of songs") :
        u.source === "speaking" ? (pt ? "no Lab de Fala" : "in the Speaking Lab") :
        pt ? "na plataforma" : "on the platform";
      return pt
        ? `${u.hours} horas reais ${src}`
        : `${u.hours} real hours ${src}`;
    }
    case "profile_flag": {
      const what =
        u.flag === "signature" ? (pt ? "assinatura" : "signature") :
        u.flag === "logo" ? (pt ? "logo da escola" : "school logo") :
        u.flag === "avatar" ? (pt ? "foto de perfil" : "profile photo") :
        u.flag === "bio" ? "bio" :
        u.flag === "location" ? (pt ? "localização" : "location") :
        u.flag === "birthday" ? (pt ? "aniversário" : "birthday") :
        u.flag === "fossy_attested" ? (pt ? "apoio ao open-source" : "open-source support") :
        u.flag;
      return pt ? `Defina sua ${what}` : `Set your ${what}`;
    }
    case "age":
      return pt ? `Ter ${u.years} anos` : `Turn ${u.years}`;
    case "calendar": {
      const when =
        u.window === "new_year" ? (pt ? "1º de janeiro" : "January 1st") :
        u.window === "christmas" ? (pt ? "25 de dezembro" : "December 25th") :
        u.window === "festa_junina" ? (pt ? "Festa Junina (20-30/jun)" : "Festa Junina (Jun 20-30)") :
        u.window;
      return pt ? `Entrar em ${when}` : `Log in on ${when}`;
    }
    case "founder":
      return pt
        ? `Entre os primeiros ${u.maxRank} usuários`
        : `Among the first ${u.maxRank} users`;
    case "composite":
      return u.description;
  }
}

export function BadgeDiscovery({ audience, progress }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const badges = useMemo(() => badgesForAudience(audience), [audience]);
  const earnedCount = badges.filter((b) => progress.earned.has(b.type)).length;

  const filtered = badges.filter((b) => {
    if (filter === "earned") return progress.earned.has(b.type);
    if (filter === "locked") return !progress.earned.has(b.type);
    return true;
  });

  // Group by theme → tier.
  const byTheme = new Map<BadgeTheme, BadgeDefinition[]>();
  for (const b of filtered) {
    if (!byTheme.has(b.theme)) byTheme.set(b.theme, []);
    byTheme.get(b.theme)!.push(b);
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {pt ? "Medalhas" : "Badges"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pt
              ? `${earnedCount} de ${badges.length} conquistadas`
              : `${earnedCount} of ${badges.length} earned`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(["all", "earned", "locked"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                filter === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pt
                ? k === "all"
                  ? "Todas"
                  : k === "earned"
                    ? "Conquistadas"
                    : "Bloqueadas"
                : k === "all"
                  ? "All"
                  : k === "earned"
                    ? "Earned"
                    : "Locked"}
            </button>
          ))}
        </div>
      </header>

      {THEME_ORDER.filter((t) => byTheme.has(t)).map((theme) => {
        const rows = byTheme.get(theme)!;
        // Earned rows first, sorted by most-recently-earned DESC
        // (matches the hero rail + teacher view). Locked rows follow,
        // sorted by tier (easy → very_hard) then name.
        rows.sort((a, b) => {
          const aEarned = progress.earned.has(a.type);
          const bEarned = progress.earned.has(b.type);
          if (aEarned !== bEarned) return aEarned ? -1 : 1;
          if (aEarned && bEarned) {
            return (progress.earnedAt[b.type] ?? 0) - (progress.earnedAt[a.type] ?? 0);
          }
          const tc = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
          if (tc !== 0) return tc;
          return a.name.localeCompare(b.name);
        });
        return (
          <section key={theme} className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {pt ? THEME_LABEL_PT[theme] : THEME_LABEL_EN[theme]}{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {rows.filter((b) => progress.earned.has(b.type)).length}/
                {rows.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((def) => (
                <BadgeCard
                  key={def.type}
                  def={def}
                  earned={progress.earned.has(def.type)}
                  progress={progressForBadge(def, progress)}
                  unlockLine={unlockText(def, pt)}
                  tierLabel={pt ? TIER_LABEL_PT[def.tier] : TIER_LABEL_EN[def.tier]}
                  earnedAt={progress.earnedAt[def.type]}
                  pt={pt}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BadgeCard({
  def,
  earned,
  progress,
  unlockLine,
  tierLabel,
  earnedAt,
  pt,
}: {
  def: BadgeDefinition;
  earned: boolean;
  progress: { value: number; threshold: number } | null;
  unlockLine: string;
  tierLabel: string;
  earnedAt?: number;
  pt: boolean;
}) {
  const pct = progress
    ? Math.max(0, Math.min(100, (progress.value / progress.threshold) * 100))
    : 0;
  const earnedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString(pt ? "pt-BR" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  if (earned) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${def.gradient} ${def.glow} p-4 text-white`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-70" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-3xl leading-none drop-shadow-md">
              {def.icon}
            </span>
            <div>
              <p className="font-semibold leading-tight">{def.name}</p>
              <p className="mt-0.5 text-[11px] opacity-90">{def.description}</p>
              {earnedDate ? (
                <p className="mt-2 text-[10px] uppercase tracking-wider opacity-75">
                  {pt ? "Conquistada em" : "Earned"} {earnedDate}
                </p>
              ) : null}
            </div>
          </div>
          <Check className="h-4 w-4 shrink-0 opacity-90" />
        </div>
        <span className="relative mt-3 inline-flex items-center rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
          {tierLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="text-3xl leading-none opacity-40 grayscale"
          >
            {def.icon}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-muted-foreground">
              {def.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              {def.description}
            </p>
            <p className="mt-2 text-[11px] font-medium text-foreground/80">
              {pt ? "Como conseguir: " : "How to earn: "}
              <span className="text-muted-foreground">{unlockLine}</span>
            </p>
            {progress ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
                  <span>
                    {progress.value % 1 === 0
                      ? progress.value.toFixed(0)
                      : progress.value.toFixed(1)}{" "}
                    / {progress.threshold}
                  </span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </div>
      <span className="mt-3 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {tierLabel}
      </span>
    </div>
  );
}
