"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";
import type { MusicMeta } from "@/lib/content/music";

export interface SelfCurriculumRow {
  assignmentId: string;
  slug: string;
  kind: "lesson" | "music";
  title: string;
  cefr: string | null;
  category: string | null;
  minutes: number | null;
  assignedAt: string;
  completedAt: string | null;
}

interface Props {
  /** The teacher's own profile — drives the "assign to myself" target. */
  teacher: { id: string; fullName: string };
  entries: SelfCurriculumRow[];
  lessons: LessonDraftMeta[];
  musics: MusicMeta[];
}

/**
 * Teacher's self-curriculum panel. Sits to the right of the existing
 * "Recent assignments" column on the dashboard so the teacher can
 * see — at a glance — what they've picked for themselves vs what
 * they've handed out. The "Atribuir para mim" button reuses the
 * standard AssignLessonButton dialog; passing students=[teacher]
 * forces its single-student branch, so the whole "whom to assign
 * to" section is hidden and every pick lands on the teacher's own
 * profile.id. classroom_id is null on those rows (migration 024
 * made that column nullable on lesson_assignments).
 */
export function SelfCurriculumPanel({
  teacher,
  entries,
  lessons,
  musics,
}: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const PREVIEW = 12;
  const visible = entries.slice(0, PREVIEW);

  return (
    <section aria-labelledby="self-curriculum-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="self-curriculum-heading"
          className="text-xl font-bold tracking-tight"
        >
          {pt ? "Meu próprio currículo" : "My own curriculum"}
        </h2>
        <AssignLessonButton
          lessons={lessons}
          musics={musics}
          classrooms={[]}
          students={[
            {
              id: teacher.id,
              fullName: teacher.fullName,
              classroomId: null,
              // Crucial — teacher.id references profiles.id, not
              // roster_students.id. Without this the picker routes
              // the id to roster_student_id and the FK rejects
              // (teachers have no roster_students row for themselves).
              idIsProfile: true,
            },
          ]}
          label={pt ? "Atribuir para mim" : "Assign to myself"}
          variant="subtle"
        />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
          {pt
            ? "Nenhuma atribuição para si mesmo ainda. Clique em “Atribuir para mim” para começar seu próprio currículo de estudo."
            : "No self-assignments yet. Hit \"Assign to myself\" to start your own learning curriculum."}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => {
            const href =
              a.kind === "music"
                ? `/student/music/${a.slug}`
                : `/student/lessons/${a.slug}`;
            const done = !!a.completedAt;
            return (
              <li
                key={a.assignmentId}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-xs transition-colors ${
                  done
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-card"
                }`}
              >
                {a.kind === "music" ? (
                  <Music2
                    className={`h-4 w-4 shrink-0 ${
                      done ? "text-emerald-500" : "text-primary"
                    }`}
                  />
                ) : (
                  <BookOpen
                    className={`h-4 w-4 shrink-0 ${
                      done ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {a.cefr ? (
                      <Badge variant="outline" className="text-[10px]">
                        {a.cefr.toUpperCase()}
                      </Badge>
                    ) : null}
                    {a.category ? <span>{a.category}</span> : null}
                    {a.minutes ? (
                      <span className="tabular-nums">{a.minutes} min</span>
                    ) : null}
                    <span className="tabular-nums">
                      {new Date(a.assignedAt).toLocaleDateString(
                        pt ? "pt-BR" : "en-US",
                        { day: "2-digit", month: "short" },
                      )}
                    </span>
                  </div>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {pt ? "Concluída" : "Completed"}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {pt ? "pendente" : "pending"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
