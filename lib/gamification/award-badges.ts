import { createAdminClient } from "@/lib/supabase/admin";
import { BADGE_DEFINITIONS } from "./config";
import { getLevel, computeStreak } from "./engine";

/**
 * Evaluates every non-certificate unlock rule for a single student and
 * upserts any newly-earned rows into the `badges` table.
 *
 * - Idempotent: existing rows are detected up-front and upsert with
 *   `ignoreDuplicates` guards against concurrent inserts.
 * - CEFR cert badges (`cert_a1` … `cert_c2`) are deliberately skipped
 *   here — those are awarded by `issueCertificate`.
 * - `perfect_lessons` is not yet tracked anywhere in the data model
 *   (lesson_progress.completed_exercises is always 0 today), so that
 *   counter currently reads as 0 for everyone. Harmless — the badge
 *   simply stays unreachable until that data is populated.
 *
 * Returns the list of badge_type strings awarded on this call (empty
 * array if the student was already up to date).
 */
export async function awardEligibleBadges(studentId: string): Promise<string[]> {
  if (!studentId) return [];

  const admin = createAdminClient();

  const [xpRes, activityRes, progressRes, existingRes] = await Promise.all([
    admin
      .from("xp_events")
      .select("xp_amount, source")
      .eq("student_id", studentId)
      .limit(50_000),
    admin
      .from("daily_activity")
      .select("activity_date")
      .eq("student_id", studentId)
      .order("activity_date", { ascending: false })
      .limit(365),
    admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at")
      .eq("student_id", studentId)
      .not("completed_at", "is", null),
    admin.from("badges").select("badge_type").eq("student_id", studentId),
  ]);

  const xpRows = (xpRes.data ?? []) as {
    xp_amount: number;
    source: string;
  }[];
  const activities = (activityRes.data ?? []) as { activity_date: string }[];
  const progressRows = (progressRes.data ?? []) as {
    lesson_slug: string;
    completed_at: string | null;
  }[];
  const existing = new Set(
    ((existingRes.data ?? []) as { badge_type: string }[]).map(
      (b) => b.badge_type,
    ),
  );

  const totalXp = xpRows.reduce((s, e) => s + (e.xp_amount ?? 0), 0);
  const level = getLevel(totalXp);
  const streak = computeStreak(activities);

  const lessonsCompleted = progressRows.filter(
    (r) => !String(r.lesson_slug).startsWith("music:"),
  ).length;
  const musicCompleted = progressRows.filter((r) =>
    String(r.lesson_slug).startsWith("music:"),
  ).length;
  const conversations = xpRows.filter((e) => e.source === "ai_chat").length;
  const perfectLessons = 0;

  const rowsToInsert: { student_id: string; badge_type: string }[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (badge.type.startsWith("cert_")) continue;
    if (existing.has(badge.type)) continue;

    const r = badge.unlock;
    let eligible = false;
    switch (r.kind) {
      case "auto":
        eligible = true;
        break;
      case "level":
        eligible = level >= r.level;
        break;
      case "streak":
        eligible = streak >= r.days;
        break;
      case "count":
        if (r.counter === "lessons_completed")
          eligible = lessonsCompleted >= r.threshold;
        else if (r.counter === "music_completed")
          eligible = musicCompleted >= r.threshold;
        else if (r.counter === "conversations")
          eligible = conversations >= r.threshold;
        else if (r.counter === "perfect_lessons")
          eligible = perfectLessons >= r.threshold;
        break;
    }

    if (eligible)
      rowsToInsert.push({ student_id: studentId, badge_type: badge.type });
  }

  if (rowsToInsert.length === 0) return [];

  const { error } = await admin
    .from("badges")
    .upsert(rowsToInsert, {
      onConflict: "student_id,badge_type",
      ignoreDuplicates: true,
    });
  if (error) {
    console.error("awardEligibleBadges upsert error:", error);
    return [];
  }

  return rowsToInsert.map((r) => r.badge_type);
}
