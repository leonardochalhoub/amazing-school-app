import Link from "next/link";
import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SpeakingDrill } from "@/components/speaking-lab/drill-client";
import type { SpeakingDialog } from "@/components/speaking-lab/dialog-runner";
import { SpeakingLabTabs } from "@/components/speaking-lab/speaking-lab-tabs";
import { listAvailableCustomDialogs } from "@/lib/actions/custom-dialogs";
import { listAvailableCustomDrills } from "@/lib/actions/custom-drills";

async function loadExercises(): Promise<SpeakingDrill[]> {
  const file = join(process.cwd(), "content/speaking-lab/exercises.json");
  const raw = await readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as { exercises: SpeakingDrill[] };
  return parsed.exercises;
}

async function loadDialogs(): Promise<SpeakingDialog[]> {
  const file = join(process.cwd(), "content/speaking-lab/dialogs.json");
  const raw = await readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as { dialogs: SpeakingDialog[] };
  return parsed.dialogs;
}

export default async function SpeakingLabPage() {
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
  const isTeacher = profile?.role === "teacher" || profile?.role === "owner";

  const [builtInDrills, builtInDialogs, customDialogs, customDrills] =
    await Promise.all([
      loadExercises(),
      loadDialogs(),
      listAvailableCustomDialogs(),
      listAvailableCustomDrills(),
    ]);

  // Merge teacher-authored drills into the same pool so the random
  // picker sees them alongside built-ins.
  const drills: SpeakingDrill[] = [
    ...customDrills.map((d) => ({
      id: `custom-${d.id}`,
      band: (d.band ?? "b1") as SpeakingDrill["band"],
      focus: d.focus ?? "custom",
      target: d.target,
      pt_hint: d.pt_hint ?? "",
    })),
    ...builtInDrills,
  ];

  // Merge teacher-authored dialogs into the shared dialog list. Custom ones
  // come first so a teacher testing their own content sees it up top.
  const mergedDialogs: SpeakingDialog[] = [
    ...customDialogs.map((d) => ({
      id: `custom-${d.id}`,
      band: d.band ?? "b1",
      title: d.title,
      pt_summary: d.pt_summary ?? undefined,
      character: d.character ?? undefined,
      turns: d.turns,
    })),
    ...builtInDialogs,
  ];

  return (
    <div className="space-y-6 overflow-x-clip pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Speaking Lab
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Speaking Lab
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record yourself speaking English and get a score. Use{" "}
            <span className="font-medium">Drills</span> for single-phrase
            pronunciation practice, or{" "}
            <span className="font-medium">Dialogs</span> for multi-turn
            conversations where the AI speaks and you respond.
          </p>
        </div>
        {isTeacher ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/speaking-lab/my-drills"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <PlusCircle className="h-4 w-4" />
              My drills
            </Link>
            <Link
              href="/speaking-lab/my-dialogs"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <PlusCircle className="h-4 w-4" />
              My dialogs
            </Link>
          </div>
        ) : null}
      </header>

      <SpeakingLabTabs drills={drills} dialogs={mergedDialogs} />
    </div>
  );
}
