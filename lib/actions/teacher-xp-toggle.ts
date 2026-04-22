"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Flip the teacher's xp_enabled flag. No data is ever deleted — if
 * the teacher turns it OFF then back ON months later, every historic
 * xp_events / badge / stat is still there. Writes simply stop while
 * off; reads can still surface the archive (the discovery page just
 * won't tempt them into new grinds).
 */
export async function setTeacherXpEnabled(
  enabled: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  // Guard: students cannot flip this — XP is mandatory for them.
  const { data: prof } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || (prof as { role?: string }).role !== "teacher") {
    return { error: "Only teachers can toggle XP" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ xp_enabled: enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/profile");
  revalidatePath("/teacher/badges");
  return { success: true };
}
