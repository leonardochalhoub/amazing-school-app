import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DrillEditor } from "@/components/speaking-lab/drill-editor";
import { isTeacherRole } from "@/lib/auth/roles";

export default async function NewDrillPage() {
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Link
        href="/speaking-lab/my-drills"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my drills
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">New drill</h1>
      <DrillEditor />
    </div>
  );
}