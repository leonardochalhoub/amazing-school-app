import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyCustomDrills } from "@/lib/actions/custom-drills";
import {
  DrillList,
  PlusCreateDrillButton,
} from "@/components/speaking-lab/drill-editor";

export default async function MyDrillsPage() {
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

  const drills = await listMyCustomDrills();

  return (
    <div className="space-y-6 overflow-x-clip pb-12">
      <Link
        href="/speaking-lab"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to speaking lab
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Speaking lab
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            My drills
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Custom pronunciation phrases you've added. They appear in the
            speaking-lab random pool alongside the built-in drills for every
            student in your classrooms.
          </p>
        </div>
        <PlusCreateDrillButton />
      </header>

      <DrillList drills={drills} />
    </div>
  );
}
