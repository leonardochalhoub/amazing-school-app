import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyCustomDialogs } from "@/lib/actions/custom-dialogs";
import { CustomDialogList, PlusCreateButton } from "@/components/speaking-lab/dialog-editor";
import { isTeacherRole } from "@/lib/auth/roles";

export default async function MyDialogsPage() {
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
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/speaking-lab");

  const dialogs = await listMyCustomDialogs();

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/speaking-lab"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Speaking Lab
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Teacher · Speaking Lab
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            My dialogs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Author custom multi-turn dialogs. Flag each turn as{" "}
            <span className="font-medium">AI</span> (TTS reads it) or{" "}
            <span className="font-medium">User</span> (student records and gets
            a score from Groq Whisper).
          </p>
        </div>
        <PlusCreateButton />
      </header>

      <CustomDialogList items={dialogs} />
    </div>
  );
}