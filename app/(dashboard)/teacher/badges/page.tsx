import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBadgeProgress } from "@/lib/actions/badge-progress";
import { BadgeDiscovery } from "@/components/gamification/badge-discovery";

export default async function TeacherBadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const progress = await getBadgeProgress(user.id);
  if (!progress) redirect("/login");

  return (
    <div className="pb-16">
      <BadgeDiscovery audience="teacher" progress={progress} />
    </div>
  );
}
