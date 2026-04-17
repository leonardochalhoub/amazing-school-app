import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Sparkles, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";
import { listMyTeacherLessons } from "@/lib/actions/teacher-lessons";
import { LessonRow } from "@/components/teacher/lesson-row";
import { CEFR_LEVELS, SKILLS } from "@/lib/content/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TeacherLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cefr?: string;
    skill?: string;
    status?: string;
    course?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/student");

  const params = await searchParams;
  const filters = {
    cefrLevel: (CEFR_LEVELS as readonly string[]).includes(params.cefr ?? "")
      ? (params.cefr as (typeof CEFR_LEVELS)[number])
      : undefined,
    category: (SKILLS as readonly string[]).includes(params.skill ?? "")
      ? (params.skill as (typeof SKILLS)[number])
      : undefined,
    status: (["draft", "published", "all"] as const).includes(
      (params.status ?? "all") as "draft" | "published" | "all"
    )
      ? ((params.status ?? "all") as "draft" | "published" | "all")
      : ("all" as const),
    courseId: params.course,
  };

  const lessons = await listLessonDrafts(filters);

  const draftCount = lessons.filter((l) => !l.published).length;
  const publishedCount = lessons.length - draftCount;

  const byCefr = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const list = byCefr.get(l.cefr_level) ?? [];
    list.push(l);
    byCefr.set(l.cefr_level, list);
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lessons
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Lesson library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review AI-generated lessons, edit them, and publish before
            assigning to students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {publishedCount} published
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {draftCount} drafts
          </Badge>
          <Link href="/teacher/lessons/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New lesson
            </Button>
          </Link>
        </div>
      </header>

      <MyLessonsSection />

      <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
        <FilterGroup label="CEFR" name="cefr" active={filters.cefrLevel}>
          <FilterPill href={urlWithout("cefr")} label="All" active={!filters.cefrLevel} />
          {CEFR_LEVELS.map((l) => (
            <FilterPill
              key={l}
              href={urlWith("cefr", l)}
              label={l.toUpperCase()}
              active={filters.cefrLevel === l}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="Skill" name="skill" active={filters.category}>
          <FilterPill href={urlWithout("skill")} label="All" active={!filters.category} />
          {SKILLS.map((s) => (
            <FilterPill
              key={s}
              href={urlWith("skill", s)}
              label={s[0].toUpperCase() + s.slice(1)}
              active={filters.category === s}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="Status" name="status" active={filters.status}>
          {(["all", "draft", "published"] as const).map((s) => (
            <FilterPill
              key={s}
              href={urlWith("status", s)}
              label={s[0].toUpperCase() + s.slice(1)}
              active={filters.status === s}
            />
          ))}
        </FilterGroup>
      </nav>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No lessons yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Claude will generate Year-1 US English lessons in a separate run.
            They will appear here as drafts for you to review.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byCefr.keys())
            .sort()
            .map((level) => {
              const group = byCefr.get(level) ?? [];
              return (
                <section key={level} className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold tracking-tight">
                      {level.toUpperCase()}
                      <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                        {group.length} lesson{group.length === 1 ? "" : "s"}
                      </span>
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {group.map((l) => (
                      <LessonRow key={l.slug} lesson={l} />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  name: string;
  active: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

// These helpers assume the filter state is URL-based.
// For simplicity, each pill builds its href directly on the route.
function urlWith(key: string, value: string): string {
  return `?${key}=${encodeURIComponent(value)}`;
}

function urlWithout(_key: string): string {
  return `/teacher/lessons`;
}

async function MyLessonsSection() {
  const mine = await listMyTeacherLessons();
  if (mine.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Your own lessons</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Build freeform lessons with your own exercise blocks. Only you
              can see them until you assign them.
            </p>
          </div>
          <Link href="/teacher/lessons/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Your own lessons</h2>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {mine.map((l) => (
          <li
            key={l.id}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {l.cefr_level ? l.cefr_level.toUpperCase() : "—"} ·{" "}
                  {l.category ?? "custom"} · {l.exercises.length} exercises
                </p>
              </div>
              <Badge
                variant={l.published ? "default" : "outline"}
                className="shrink-0 text-[10px]"
              >
                {l.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="mt-3 flex justify-end">
              <Link href={`/teacher/lessons/edit/${l.slug}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
