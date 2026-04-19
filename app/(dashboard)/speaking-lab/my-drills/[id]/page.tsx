import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DrillEditor } from "@/components/speaking-lab/drill-editor";
import type { CustomDrill } from "@/lib/actions/custom-drills";

export default async function EditDrillPage({
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

  const { data: drill } = await admin
    .from("custom_speaking_drills")
    .select(
      "id, teacher_id, band, focus, target, pt_hint, is_public, updated_at",
    )
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!drill) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Link
        href="/speaking-lab/my-drills"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my drills
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Edit drill</h1>
      <DrillEditor existing={drill as CustomDrill} />
    </div>
  );
}
