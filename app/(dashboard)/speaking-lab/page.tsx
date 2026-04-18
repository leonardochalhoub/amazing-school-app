import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import type { SpeakingDrill } from "@/components/speaking-lab/drill-client";
import type { SpeakingDialog } from "@/components/speaking-lab/dialog-runner";
import { SpeakingLabTabs } from "@/components/speaking-lab/speaking-lab-tabs";

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

  const [drills, dialogs] = await Promise.all([loadExercises(), loadDialogs()]);

  return (
    <div className="space-y-6 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Speaking Lab
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Speaking Lab
        </h1>
        <p className="text-sm text-muted-foreground">
          Record yourself speaking English and get a score. Use{" "}
          <span className="font-medium">Drills</span> for single-phrase
          pronunciation practice, or{" "}
          <span className="font-medium">Dialogs</span> for multi-turn
          conversations where the AI speaks and you respond.
        </p>
      </header>

      <SpeakingLabTabs drills={drills} dialogs={dialogs} />
    </div>
  );
}
