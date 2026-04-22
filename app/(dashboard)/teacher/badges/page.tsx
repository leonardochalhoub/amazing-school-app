import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBadgeProgress } from "@/lib/actions/badge-progress";
import { BadgeDiscovery } from "@/components/gamification/badge-discovery";

export default async function TeacherBadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // XP opt-in gate — if the teacher has XP turned off in their
  // profile, send them back to the toggle rather than showing an
  // empty scoreboard. xp_enabled lives on profiles only after
  // migration 062; select it defensively so a fresh DB still routes
  // correctly.
  const admin = createAdminClient();
  const { data: roleRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  let xpEnabled = true;
  try {
    const { data: xpRow } = await admin
      .from("profiles")
      .select("xp_enabled")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (xpRow as { xp_enabled?: boolean | null } | null)?.xp_enabled;
    if (raw === false) xpEnabled = false;
  } catch {
    /* column absent → assume on */
  }
  if ((roleRow as { role?: string } | null)?.role === "teacher" && !xpEnabled) {
    redirect("/teacher/profile");
  }

  const progress = await getBadgeProgress(user.id);
  if (!progress) redirect("/login");

  return (
    <div className="pb-16">
      <BadgeDiscovery audience="teacher" progress={progress} />
    </div>
  );
}
