import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Sparkles, Plus, Pencil, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listLessonDrafts } from "@/lib/actions/lesson-drafts";
import { listMyTeacherLessons } from "@/lib/actions/teacher-lessons";
import { listMyBank } from "@/lib/actions/exercise-bank";
import { getAllLessons } from "@/lib/content/loader";
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { getTeacherOverview } from "@/lib/actions/teacher-dashboard";
import { AssignLessonButton } from "@/components/teacher/assign-lesson-button";
import { BulkAssignList } from "@/components/teacher/bulk-assign-list";
import { LessonRow } from "@/components/teacher/lesson-row";
import {
  CEFR_BANDS,
  CEFR_BAND_SET,
  SKILLS,
  UI_SKILLS,
  UI_SKILL_SET,
  cefrBandOf,
} from "@/lib/content/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";
import type { TeacherLessonRow } from "@/lib/actions/teacher-lessons-types";

type Source = "all" | "library" | "curated" | "mine" | "bank";

interface UnifiedRow {
  source: "library" | "curated" | "mine";
  slug: string;
  title: string;
  cefr_level: string;
  category: string;
  published: boolean;
  updated_at: string;
  href: string;
  exerciseCount?: number;
}

export default async function TeacherLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cefr?: string;
    skill?: string;
    status?: string;
    course?: string;
    source?: string;
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
  const cefrBand = CEFR_BAND_SET.has(params.cefr ?? "")
    ? (params.cefr as (typeof CEFR_BANDS)[number])
    : undefined;
  const skillParam = UI_SKILL_SET.has(params.skill ?? "")
    ? (params.skill as (typeof UI_SKILLS)[number])
    : undefined;
  // Only push `category` to the DB query when the skill is a real lesson
  // category (grammar/vocabulary/reading/listening/narrative). Virtual
  // skills (speaking, dialog) are applied post-fetch via scene flags.
  const categoryForQuery = (SKILLS as readonly string[]).includes(skillParam ?? "")
    ? (skillParam as (typeof SKILLS)[number])
    : undefined;
  const filters = {
    cefrBand,
    category: categoryForQuery,
    skill: skillParam,
    status: (["draft", "published", "all"] as const).includes(
      (params.status ?? "all") as "draft" | "published" | "all"
    )
      ? ((params.status ?? "all") as "draft" | "published" | "all")
      : ("all" as const),
    courseId: params.course,
  };
  const source: Source = (
    ["all", "library", "curated", "mine", "bank"] as const
  ).includes(params.source as Source)
    ? (params.source as Source)
    : "all";

  const [curatedAll, myLessons, bankItems, assignable, overview] =
    await Promise.all([
      // Don't push cefr to the DB query — we want band-prefix matching, which
      // we do in memory after fetching.
      listLessonDrafts({
        category: filters.category,
        status: filters.status,
        courseId: filters.courseId,
      }),
      listMyTeacherLessons(),
      listMyBank(),
      getAssignableLessons(),
      getTeacherOverview(),
    ]);

  const curatedLessons = curatedAll.filter((l) => {
    if (filters.cefrBand && cefrBandOf(l.cefr_level) !== filters.cefrBand) {
      return false;
    }
    // Virtual skills — curated drafts haven't adopted scene-based content
    // yet, so drop them on speaking/dialog filters.
    if (filters.skill === "speaking" || filters.skill === "dialog") return false;
    return true;
  });

  // Static "library" content shipped in content/lessons/*.json — the 45+
  // authored narrative + drill lessons. Apply the same filters.
  const libraryLessons = getAllLessons().filter((l) => {
    if (filters.cefrBand && cefrBandOf(l.cefr_level) !== filters.cefrBand) return false;
    if (filters.category && l.category !== filters.category) return false;
    if (filters.skill === "speaking" && !l.has_speaking_scene) return false;
    if (filters.skill === "dialog" && !l.has_dialog_scene) return false;
    // Library content is always considered "published".
    if (filters.status === "draft") return false;
    return true;
  });

  // Apply CEFR / skill / status filters to teacher-authored lessons too.
  const filteredMine = myLessons.filter((l) => {
    if (filters.cefrBand && cefrBandOf(l.cefr_level ?? "") !== filters.cefrBand) return false;
    if (filters.category && l.category !== filters.category) return false;
    // Virtual skills don't apply to teacher-authored lessons until they
    // opt in by including such scenes — skip on "speaking"/"dialog".
    if (filters.skill === "speaking" || filters.skill === "dialog") return false;
    if (filters.status === "draft" && l.published) return false;
    if (filters.status === "published" && !l.published) return false;
    return true;
  });

  const unified: UnifiedRow[] = [];
  if (source === "all" || source === "library") {
    for (const l of libraryLessons) {
      unified.push({
        source: "library",
        slug: l.slug,
        title: l.title,
        cefr_level: l.cefr_level,
        category: l.category,
        published: true,
        updated_at: "",
        // Library rows open the teacher PREVIEW (metadata + scene list +
        // 'See as student' button). Students still get the player at
        // /student/lessons/{slug}.
        href: `/teacher/lessons/library/${l.slug}`,
        exerciseCount: l.exercise_count,
      });
    }
  }
  if (source === "all" || source === "curated") {
    for (const l of curatedLessons as LessonDraftMeta[]) {
      unified.push({
        source: "curated",
        slug: l.slug,
        title: l.title,
        cefr_level: l.cefr_level,
        category: l.category,
        published: l.published,
        updated_at: l.updated_at,
        href: `/teacher/lessons/${l.slug}`,
      });
    }
  }
  if (source === "all" || source === "mine") {
    for (const l of filteredMine as TeacherLessonRow[]) {
      unified.push({
        source: "mine",
        slug: l.slug,
        title: l.title,
        cefr_level: l.cefr_level ?? "a1.1",
        category: l.category ?? "custom",
        published: l.published,
        updated_at: l.updated_at,
        href: `/teacher/lessons/edit/${l.slug}`,
        exerciseCount: l.exercises.length,
      });
    }
  }

  const draftCount = unified.filter((l) => !l.published).length;
  const publishedCount = unified.length - draftCount;

  const byCefr = new Map<string, UnifiedRow[]>();
  for (const l of unified) {
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {publishedCount} published
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {draftCount} drafts
          </Badge>
          <AssignLessonButton
            lessons={assignable}
            classrooms={overview.classrooms.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            students={overview.roster.map((r) => ({
              id: r.id,
              fullName: r.fullName,
              classroomId: r.classroomId,
            }))}
            variant="primary"
            label="Assign"
          />
          <Link href="/teacher/lessons/new">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New lesson
            </Button>
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
        <FilterGroup label="Source" name="source" active={source === "all" ? undefined : source}>
          {(
            [
              { key: "all", label: "All" },
              { key: "library", label: "Library" },
              { key: "curated", label: "Curated" },
              { key: "mine", label: "My lessons" },
              { key: "bank", label: "My exercises" },
            ] as const
          ).map((s) => (
            <FilterPill
              key={s.key}
              href={s.key === "all" ? urlWithout("source") : urlWith("source", s.key)}
              label={s.label}
              active={source === s.key}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="CEFR" name="cefr" active={filters.cefrBand}>
          <FilterPill href={urlWithout("cefr")} label="All" active={!filters.cefrBand} />
          {CEFR_BANDS.map((b) => (
            <FilterPill
              key={b}
              href={urlWith("cefr", b)}
              label={b.toUpperCase()}
              active={filters.cefrBand === b}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="Skill" name="skill" active={filters.skill}>
          <FilterPill href={urlWithout("skill")} label="All" active={!filters.skill} />
          {UI_SKILLS.map((s) => (
            <FilterPill
              key={s}
              href={urlWith("skill", s)}
              label={s[0].toUpperCase() + s.slice(1)}
              active={filters.skill === s}
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

      {source === "bank" ? (
        <BankItemsList items={bankItems} filters={{ cefrBand: filters.cefrBand }} />
      ) : unified.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No lessons match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adjust the filters above, or{" "}
            <Link href="/teacher/lessons/new" className="underline hover:text-foreground">
              create a new lesson
            </Link>
            .
          </p>
        </div>
      ) : (
        <BulkAssignList
          rows={unified.map((l) => ({
            slug: l.slug,
            title: l.title,
            cefr_level: l.cefr_level,
            category: l.category,
            exerciseCount: l.exerciseCount,
            href: l.href,
            source: l.source,
            published: l.published,
          }))}
          classrooms={overview.classrooms.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          students={overview.roster.map((r) => ({
            id: r.id,
            fullName: r.fullName,
            classroomId: r.classroomId,
          }))}
        />
      )}
    </div>
  );
}

function LibraryLessonRow({ row }: { row: UnifiedRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/40">
      <Link href={row.href} className="group min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-primary">
            {row.title}
          </p>
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
            {row.category === "narrative" ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            {row.category === "narrative" ? "Story" : "Library"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {row.cefr_level.toUpperCase()} · {row.category}
          {row.exerciseCount != null ? ` · ${row.exerciseCount} exercises` : ""}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="default" className="text-[10px]">
          Core
        </Badge>
        <Link
          href={`/teacher?assign=${encodeURIComponent(row.slug)}`}
          className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
        >
          Assign
        </Link>
      </div>
    </div>
  );
}

function MyLessonRow({ row }: { row: UnifiedRow }) {
  return (
    <Link
      href={row.href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{row.title}</p>
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
            <Pencil className="h-3 w-3" />
            Mine
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {row.cefr_level.toUpperCase()} · {row.category}
          {row.exerciseCount != null ? ` · ${row.exerciseCount} exercises` : ""}
        </p>
      </div>
      <Badge
        variant={row.published ? "default" : "outline"}
        className="shrink-0 text-[10px]"
      >
        {row.published ? "Published" : "Draft"}
      </Badge>
    </Link>
  );
}

function BankItemsList({
  items,
  filters,
}: {
  items: Awaited<ReturnType<typeof listMyBank>>;
  filters: { cefrBand?: string };
}) {
  const filtered = items.filter((i) => {
    if (filters.cefrBand && cefrBandOf(i.cefr_level ?? "") !== filters.cefrBand) return false;
    return true;
  });
  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
        <Library className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Your exercise bank is empty</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Save exercises as you build lessons to reuse them later. Manage the
          full bank at{" "}
          <Link href="/teacher/bank" className="underline hover:text-foreground">
            /teacher/bank
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Your saved exercises (not full lessons). Manage public/private status on{" "}
        <Link href="/teacher/bank" className="underline hover:text-foreground">
          the bank page
        </Link>
        .
      </p>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium">{item.title}</p>
              <Badge
                variant={item.is_public ? "default" : "outline"}
                className="shrink-0 text-[10px]"
              >
                {item.is_public ? "Public" : "Private"}
              </Badge>
            </div>
            <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
              {item.cefr_level ? (
                <Badge variant="outline" className="text-[10px]">
                  {item.cefr_level.toUpperCase()}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="text-[10px]">
                {item.exercise.type.replace(/_/g, " ")}
              </Badge>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {item.uses_count} uses
              </span>
            </p>
          </li>
        ))}
      </ul>
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

