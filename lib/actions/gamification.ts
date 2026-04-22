"use server";

import { createClient } from "@/lib/supabase/server";
import { getLevel, computeStreak } from "@/lib/gamification/engine";
import { BADGE_DEFINITIONS } from "@/lib/gamification/config";
import { awardEligibleBadges } from "@/lib/gamification/award-badges";

export async function getStudentStats(studentId?: string) {
  const supabase = await createClient();

  let userId = studentId;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("student_id", userId)
    .limit(50_000);

  const totalXp = xpEvents?.reduce((sum, e) => sum + e.xp_amount, 0) ?? 0;
  const level = getLevel(totalXp);

  const { data: activities } = await supabase
    .from("daily_activity")
    .select("activity_date")
    .eq("student_id", userId)
    .order("activity_date", { ascending: false })
    .limit(60);

  const streak = computeStreak(activities ?? []);

  // Lazy catch-up: students who signed up before the badge hook was
  // wired (e.g. Tati) otherwise never receive `welcome_aboard` or any
  // other retroactively-earned badge. `awardEligibleBadges` is
  // idempotent — existing rows are skipped — so re-running it on
  // every stats read is cheap and self-healing.
  try {
    await awardEligibleBadges(userId);
  } catch (err) {
    console.error("getStudentStats lazy badge award:", err);
  }

  const { data: earnedBadges } = await supabase
    .from("badges")
    .select("badge_type, earned_at")
    .eq("student_id", userId)
    // Most recent first — every consumer (hero rail, teacher view,
    // discovery page) surfaces the freshest achievement at the top.
    .order("earned_at", { ascending: false });

  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("completed_at")
    .eq("student_id", userId)
    .not("completed_at", "is", null);

  return {
    totalXp,
    level,
    streak,
    earnedBadges: earnedBadges?.map((b) => b.badge_type) ?? [],
    lessonsCompleted: lessonProgress?.length ?? 0,
    allBadges: BADGE_DEFINITIONS,
  };
}

export async function getLeaderboard(classroomId: string) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("classroom_members")
    .select("student_id, profiles(full_name, avatar_url)")
    .eq("classroom_id", classroomId);

  if (!members) return [];

  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("student_id, xp_amount")
    .eq("classroom_id", classroomId)
    .limit(50_000);

  const xpMap: Record<string, number> = {};
  xpEvents?.forEach((e) => {
    xpMap[e.student_id] = (xpMap[e.student_id] ?? 0) + e.xp_amount;
  });

  return members
    .map((m) => ({
      studentId: m.student_id,
      name: (m.profiles as unknown as { full_name: string })?.full_name ?? "Unknown",
      avatarUrl: (m.profiles as unknown as { avatar_url: string | null })?.avatar_url,
      totalXp: xpMap[m.student_id] ?? 0,
      level: getLevel(xpMap[m.student_id] ?? 0),
    }))
    .sort((a, b) => b.totalXp - a.totalXp);
}
