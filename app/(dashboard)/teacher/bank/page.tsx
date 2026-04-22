import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBankEntryVersions,
  listBankEntries,
  sysadminListAllPersonalizedLessons,
  sysadminListDeletedBankEntries,
} from "@/lib/actions/lesson-bank";
import { listMyTeacherLessons } from "@/lib/actions/teacher-lessons";
import { LessonBankBrowser } from "@/components/teacher/lesson-bank-browser";
import { MyLessonsBrief } from "@/components/teacher/my-lessons-brief";
import { isOwner as checkIsOwner, isTeacherRole } from "@/lib/auth/roles";
import { T } from "@/components/reports/t";
import type { LessonBankVersionRow } from "@/lib/actions/lesson-bank-types";

/**
 * Unified bank view. Teachers flip between:
 *   - **My lessons**  → their personalized teacher_lessons (author-only).
 *   - **Bank lessons** → community-shared snapshots (anyone can read,
 *                        only the author edits/deletes).
 *
 * Everything that used to live in the separate "exercise bank" is now
 * surfaced through the lesson-level flow; individual exercise reuse
 * happens inside the lesson builder via import-from-lesson links.
 */
export default async function TeacherBankPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
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
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/student");

  const params = await searchParams;
  const view = params.view === "mine" ? "mine" : "bank";

  const owner = await checkIsOwner();

  const [entries, myLessons, personalizedLessons, deletedEntries] =
    await Promise.all([
      listBankEntries({ sort: "recent", limit: 200 }),
      listMyTeacherLessons(),
      owner
        ? sysadminListAllPersonalizedLessons()
        : Promise.resolve([] as Awaited<
            ReturnType<typeof sysadminListAllPersonalizedLessons>
          >),
      owner
        ? sysadminListDeletedBankEntries()
        : Promise.resolve([] as Awaited<
            ReturnType<typeof sysadminListDeletedBankEntries>
          >),
    ]);

  // Pre-fetch versions for every entry in one pass.
  const versionsByEntry: Record<string, LessonBankVersionRow[]> = {};
  await Promise.all(
    entries.map(async (e) => {
      versionsByEntry[e.id] = await getBankEntryVersions(e.id);
    }),
  );

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <T en="Back to lessons" pt="Voltar para lições" />
      </Link>
      <header className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Library className="h-3.5 w-3.5" />
          <span>
            <T en="Bank" pt="Banco" />
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          <T en="Lesson bank" pt="Banco de lições" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <T
            en="Share lessons with the community, bring other teachers' lessons into your environment with auto-sync when the author revises, and browse the full version history."
            pt="Compartilhe lições com a comunidade, traga lições de outros professores para o seu ambiente com atualização automática quando o autor revisar e veja todo o histórico de versões."
          />
        </p>
      </header>

      <nav className="flex items-center gap-1 rounded-full border border-border bg-background p-1 w-max">
        <Link
          href="/teacher/bank?view=mine"
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            view === "mine"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <T
            en={`My lessons (${myLessons.length})`}
            pt={`Minhas lições (${myLessons.length})`}
          />
        </Link>
        <Link
          href="/teacher/bank?view=bank"
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            view === "bank"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <T
            en={`Bank lessons (${entries.length})`}
            pt={`Lições do banco (${entries.length})`}
          />
        </Link>
      </nav>

      {view === "mine" ? (
        <MyLessonsBrief lessons={myLessons} />
      ) : (
        <LessonBankBrowser
          entries={entries}
          myAuthorId={user.id}
          isOwner={owner}
          versionsByEntry={versionsByEntry}
          deletedEntries={deletedEntries.map((d) => ({
            ...d,
            author_name: null,
            author_email: null,
            migration: null,
          }))}
          personalizedLessons={personalizedLessons}
        />
      )}
    </div>
  );
}
