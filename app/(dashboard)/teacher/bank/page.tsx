import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyBank, listPublicBank } from "@/lib/actions/exercise-bank";
import {
  getBankEntryVersions,
  listBankEntries,
  sysadminListAllPersonalizedLessons,
  sysadminListDeletedBankEntries,
} from "@/lib/actions/lesson-bank";
import { BankBrowser } from "@/components/teacher/bank-browser";
import { LessonBankBrowser } from "@/components/teacher/lesson-bank-browser";
import { BankTabs } from "@/components/teacher/bank-tabs";
import { isOwner as checkIsOwner, isTeacherRole } from "@/lib/auth/roles";
import { T } from "@/components/reports/t";
import type { LessonBankVersionRow } from "@/lib/actions/lesson-bank-types";

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
  const view = params.view === "exercises" ? "exercises" : "lessons";

  const owner = await checkIsOwner();

  const [mineEx, publicEx, entries, personalizedLessons, deletedEntries] =
    await Promise.all([
      listMyBank(),
      listPublicBank({ limit: 60 }),
      listBankEntries({ sort: "recent", limit: 200 }),
      owner
        ? sysadminListAllPersonalizedLessons()
        : Promise.resolve([] as Awaited<
            ReturnType<typeof sysadminListAllPersonalizedLessons>
          >),
      owner
        ? listBankEntries({ limit: 200 }).then(() =>
            sysadminListDeletedBankEntries(),
          )
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
          <T en="Lesson & exercise bank" pt="Banco de lições e exercícios" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <T
            en="Share lessons with the community, migrate them into your environment with automatic updates when the author revises, and browse the full version history. Exercise blocks live in a separate tab."
            pt="Compartilhe lições com a comunidade, migre-as para o seu ambiente com atualização automática quando o autor revisar e veja todo o histórico de versões. Blocos de exercícios ficam em outra aba."
          />
        </p>
      </header>

      <BankTabs current={view} />

      {view === "lessons" ? (
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
      ) : (
        <BankBrowser mine={mineEx} publicItems={publicEx} />
      )}
    </div>
  );
}
