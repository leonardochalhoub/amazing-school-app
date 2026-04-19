"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PRESETS, type DemoKind } from "@/lib/demo/presets";

const DEMO_PASSWORD =
  process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-explore-amazing-school-2026";

/**
 * Signs the visitor into the pre-seeded teacher or student demo account
 * and lands them on the matching dashboard. Keeps the demo walled off
 * from real signups — anyone changing things in the demo is changing
 * demo data, nothing else.
 */
export async function loginAsDemo(kind: DemoKind) {
  const preset = DEMO_PRESETS[kind];
  if (!preset) return { error: "Unknown demo preset" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: preset.email,
    password: DEMO_PASSWORD,
  });
  if (error) {
    return {
      error:
        "Demo accounts are not available right now. The seed script may need to run.",
    };
  }
  redirect(preset.role === "teacher" ? "/teacher" : "/student");
}
