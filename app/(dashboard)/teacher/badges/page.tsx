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
  // empty scoreboard. Flipping it back on later restores every
  // historical badge they previously earned.
  const admin = createAdminClient();
  const { data: profRow } = await admin
    .from("profiles")
    .select("xp_enabled, role")
    .eq("id", user.id)
    .maybeSingle();
  const prof = profRow as { xp_enabled?: boolean; role?: string } | null;
  if (prof?.role === "teacher" && prof.xp_enabled === false) {
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
