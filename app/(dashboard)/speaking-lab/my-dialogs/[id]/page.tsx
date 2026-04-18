import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyCustomDialogs } from "@/lib/actions/custom-dialogs";
import { CustomDialogEditor } from "@/components/speaking-lab/dialog-editor";

export default async function EditDialogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  if (profile?.role !== "teacher") redirect("/speaking-lab");

  const mine = await listMyCustomDialogs();
  const dialog = mine.find((d) => d.id === id);
  if (!dialog) notFound();

  return (
    <div className="space-y-4 pb-16">
      <Link
        href="/speaking-lab/my-dialogs"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my dialogs
      </Link>
      <CustomDialogEditor initial={dialog} />
    </div>
  );
}
