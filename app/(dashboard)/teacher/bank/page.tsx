import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyBank, listPublicBank } from "@/lib/actions/exercise-bank";
import { BankBrowser } from "@/components/teacher/bank-browser";
import { isTeacherRole } from "@/lib/auth/roles";
import { T } from "@/components/reports/t";

export default async function TeacherBankPage() {
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

  const [mine, publicItems] = await Promise.all([
    listMyBank(),
    listPublicBank({ limit: 60 }),
  ]);

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
            <T en="Exercise bank" pt="Banco de exercícios" />
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          <T en="Question bank" pt="Banco de questões" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <T
            en={
              <>
                Reusable exercise blocks. Mark any item <em>public</em> to
                share it with other teachers — they can import your exercises
                into their own lessons. Popular items rise to the top.
              </>
            }
            pt={
              <>
                Blocos de exercícios reutilizáveis. Marque um item como{" "}
                <em>público</em> para compartilhá-lo com outros professores —
                eles podem importar seus exercícios para suas próprias lições.
                Itens populares sobem para o topo.
              </>
            }
          />
        </p>
      </header>
      <BankBrowser mine={mine} publicItems={publicItems} />
    </div>
  );
}