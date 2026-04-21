"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/context";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";

export interface RosterCardProps {
  id: string;
  fullName: string;
  classroomName?: string | null;
  avatarUrl?: string | null;
  accentIndex?: number;
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
  level?: "a1" | "a2" | "b1" | "b2" | "c1" | "c2" | "y4" | null;
}

const RING_GRADIENTS = [
  "from-indigo-500 via-violet-500 to-pink-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-sky-500 via-blue-500 to-indigo-500",
  "from-pink-500 via-rose-500 to-orange-500",
];

const AGE_LABELS_EN: Record<AgeGroup, string> = {
  kid: "Kid",
  teen: "Teen",
  adult: "Adult",
};

function ageLabelPt(ageGroup: AgeGroup, gender: Gender | null | undefined): string {
  // Only "adult" is gendered in pt-BR (Adulto/Adulta). Kid and teen
  // use gender-neutral forms.
  if (ageGroup === "kid") return "Criança";
  if (ageGroup === "teen") return "Adolescente";
  return gender === "female" ? "Adulta" : "Adulto";
}

export function RosterCard({
  id,
  fullName,
  classroomName,
  avatarUrl,
  accentIndex = 0,
  ageGroup,
  gender,
  level,
}: RosterCardProps) {
  const { locale } = useI18n();
  const gradient = RING_GRADIENTS[accentIndex % RING_GRADIENTS.length];
  const noClassroomLabel = locale === "pt-BR" ? "Sem turma" : "No classroom";
  const ageLabel = ageGroup
    ? locale === "pt-BR"
      ? ageLabelPt(ageGroup, gender ?? null)
      : AGE_LABELS_EN[ageGroup]
    : null;
  const levelLabel = level ? level.toUpperCase() : null;

  return (
    <Link href={`/teacher/students/${id}`} className="group block w-full">
      <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted shadow-sm ring-2 ring-background">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="h-full w-full">
              <CartoonAvatar
                ageGroup={ageGroup}
                gender={gender}
                seed={id}
                fullName={fullName}
              />
            </div>
          )}
        </div>
        <div className="relative min-w-0 w-full text-center">
          <p className="truncate text-sm font-semibold leading-tight">
            {fullName}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
            {ageLabel ? <span>{ageLabel}</span> : null}
            {ageLabel && (classroomName || levelLabel) ? <span>·</span> : null}
            {classroomName ? (
              <span className="truncate">{classroomName}</span>
            ) : ageLabel ? null : (
              <span className="italic">{noClassroomLabel}</span>
            )}
            {levelLabel ? (
              <>
                {(ageLabel || classroomName) ? <span>·</span> : null}
                <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-1.5 py-0 font-semibold tracking-wide text-indigo-700 dark:text-indigo-300">
                  {levelLabel}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </Link>
  );
}
