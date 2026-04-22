import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole, isOwner as checkIsOwner } from "@/lib/auth/roles";
import { listMyMessages } from "@/lib/actions/sysadmin-messages";
import { MessagesThreadList } from "@/components/shared/messages-thread-list";
import { T } from "@/components/reports/t";

export default async function TeacherMessagesPage() {
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

  const messages = await listMyMessages({ limit: 200 });
  const isOwner = await checkIsOwner();

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/teacher/profile"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <T en="Back to profile" pt="Voltar para o perfil" />
      </Link>
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" />
          <span>
            <T en="Messages" pt="Mensagens" />
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          <T en="Messages with sysadmin" pt="Mensagens com o sysadmin" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <T
            en="Full history of review requests, suggestions, and approvals. Newest first."
            pt="Histórico completo de revisões, sugestões e aprovações. Mais recentes primeiro."
          />
        </p>
      </header>
      <MessagesThreadList messages={messages} myId={user.id} isOwner={isOwner} />
    </div>
  );
}
