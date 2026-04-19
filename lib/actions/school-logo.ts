"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The white-label logo currently has a single approved filename in the
 * `public/` folder. Whitelisted teachers see a toggle on their Profile
 * page that flips `profiles.school_logo_enabled` on/off.
 */
export const SCHOOL_LOGO_SRC = "/T%20-%202.png";

const WHITELISTED_EMAILS = ["leochalhoub@hotmail.com"];
function nameMatchesWhitelist(name: string): boolean {
  const n = name.toLowerCase().trim();
  if (!n) return false;
  if (n === "leonardo chalhoub" || n === "leo chalhoub") return true;
  if (n.includes("tatiana") && n.includes("sequeira")) return true;
  return false;
}

export function isLogoEligible(
  email: string | null | undefined,
  fullName: string,
): boolean {
  const mail = (email ?? "").toLowerCase().trim();
  if (WHITELISTED_EMAILS.includes(mail)) return true;
  return nameMatchesWhitelist(fullName);
}

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
