"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLogoEligible } from "@/lib/school-logo";

export async function setSchoolLogoEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Profile not found" };
  const p = profile as { full_name: string; role: string };
  if (p.role !== "teacher") return { error: "Teacher only" };
  if (!isLogoEligible(user.email, p.full_name)) {
    return { error: "Not allowed on this account" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ school_logo_enabled: enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/profile");
  return { success: true as const };
}
