import Link from "next/link";
import Image from "next/image";
import { Flame, Clock } from "lucide-react";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";
import { getLevel } from "@/lib/gamification/engine";

export interface StudentRow {
  classroomId: string;
  studentId: string;
  fullName: string;
  totalXp: number;
  streak: number;
  assigned: number;
  completed: number;
  lastActivity: string | null;
  avatarUrl?: string | null;
  classroomName?: string;
  isRoster?: boolean;
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
}

function fmtLastActivity(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function StudentCard({ row }: { row: StudentRow }) {
  const pct =
    row.assigned > 0 ? Math.round((row.completed / row.assigned) * 100) : 0;
  const level = getLevel(row.totalXp);
  const href = row.isRoster
    ? `/teacher/students/${row.studentId}`
    : `/teacher/classroom/${row.classroomId}/students/${row.studentId}`;

  return (
    <Link
      href={href}
      className="group block"
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-muted ring-2 ring-background">
              {row.avatarUrl ? (
                <Image
                  src={row.avatarUrl}
                  alt={row.fullName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <CartoonAvatar
                  ageGroup={row.ageGroup}
                  gender={row.gender}
                  seed={row.studentId}
                  fullName={row.fullName}
                />
              )}
            </div>
            {!row.isRoster ? (
              <span className="absolute -right-1 -bottom-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm">
                {level}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {row.fullName}
            </p>
            {row.classroomName ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {row.classroomName}
              </p>
            ) : null}
            {!row.isRoster ? (
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {row.totalXp} XP
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                Roster
              </p>
            )}
          </div>
        </div>

        {!row.isRoster ? (
          <>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {row.completed} / {row.assigned} lessons
                </span>
                <span className="font-medium tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500" />
                <span className="font-medium tabular-nums">{row.streak}d</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmtLastActivity(row.lastActivity)}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </Link>
  );
}
