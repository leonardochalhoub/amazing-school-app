import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { SpeakingLabDrill, type SpeakingDrill } from "@/components/speaking-lab/drill-client";

async function loadExercises(): Promise<SpeakingDrill[]> {
  const file = join(process.cwd(), "content/speaking-lab/exercises.json");
  const raw = await readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as { exercises: SpeakingDrill[] };
  return parsed.exercises;
}

export default async function SpeakingLabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const exercises = await loadExercises();

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
          Click the lab and a random pronunciation drill appears. Read it out
          loud, record yourself, and get a score. Tap{" "}
          <span className="font-medium">Next exercise</span> to try another of
          the {exercises.length} drills in rotation.
        </p>
      </header>

      <SpeakingLabDrill all={exercises} />
    </div>
  );
}
