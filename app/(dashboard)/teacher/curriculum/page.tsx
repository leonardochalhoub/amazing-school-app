import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllLessons } from "@/lib/content/loader";
import curriculumRaw from "@/content/curriculum.json";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Sparkles } from "lucide-react";

interface CurriculumUnit {
  title: string;
  lessons: string[];
}
interface CurriculumSemester {
  semester: number;
  cefr: string;
  target_hours: number;
  theme: string;
  units: CurriculumUnit[];
}
interface CurriculumYear {
  year: number;
  label: string;
  level_label: string;
  semesters: CurriculumSemester[];
}
interface CurriculumFile {
  years: CurriculumYear[];
}

const CURRICULUM = curriculumRaw as CurriculumFile;

export default async function TeacherCurriculumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/");

  const all = getAllLessons();
  const bySlug = new Map(all.map((l) => [l.slug, l]));
  const bySemester = new Map<string, typeof all>();
  for (const l of all) {
    const arr = bySemester.get(l.cefr_level) ?? [];
    arr.push(l);
    bySemester.set(l.cefr_level, arr);
  }

  return (
    <div className="space-y-8 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Teacher
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Curriculum</h1>
        <p className="text-sm text-muted-foreground">
          Every lesson in the course, organized year by year. Click any lesson
          title to open it — same player your students use.
        </p>
      </header>

      {CURRICULUM.years.map((year) => (
        <section key={year.year} className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Year {year.year} · {year.label}
            </h2>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {year.level_label}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {year.semesters.map((sem) => {
              const inSem = bySemester.get(sem.cefr) ?? [];
              return (
                <Card key={sem.semester} className="overflow-hidden">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Semester {sem.semester}
                        </p>
                        <p className="text-sm font-semibold">
                          {sem.cefr.toUpperCase()} · {sem.theme}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {inSem.length} lessons
                      </Badge>
                    </div>

                    {sem.units.map((unit, ui) => (
                      <div key={ui} className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {unit.title}
                        </p>
                        <ul className="space-y-0.5">
                          {unit.lessons.map((slug) => {
                            const lesson = bySlug.get(slug);
                            return (
                              <li key={slug}>
                                {lesson ? (
                                  <Link
                                    href={`/student/lessons/${slug}`}
                                    className="inline-flex items-center gap-1.5 text-sm hover:text-primary hover:underline"
                                  >
                                    {lesson.category === "narrative" ? (
                                      <Sparkles className="h-3 w-3 text-primary" />
                                    ) : (
                                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    {lesson.title}
                                    <Clock className="ml-1 h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">
                                      {lesson.estimated_minutes}m
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="text-sm text-muted-foreground/60">
                                    {slug}{" "}
                                    <span className="text-[10px]">
                                      (not authored yet)
                                    </span>
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}

                    {(() => {
                      const knownSlugs = new Set(
                        sem.units.flatMap((u) => u.lessons)
                      );
                      const extras = inSem.filter(
                        (l) => !knownSlugs.has(l.slug)
                      );
                      if (extras.length === 0) return null;
                      return (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Extras at this level
                          </p>
                          <ul className="space-y-0.5">
                            {extras.map((l) => (
                              <li key={l.slug}>
                                <Link
                                  href={`/student/lessons/${l.slug}`}
                                  className="inline-flex items-center gap-1.5 text-sm hover:text-primary hover:underline"
                                >
                                  {l.category === "narrative" ? (
                                    <Sparkles className="h-3 w-3 text-primary" />
                                  ) : (
                                    <BookOpen className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {l.title}
                                  <Clock className="ml-1 h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">
                                    {l.estimated_minutes}m
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
