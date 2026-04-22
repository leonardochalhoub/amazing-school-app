"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLevel, computeStreak } from "@/lib/gamification/engine";

/**
 * Full per-user metric bundle used by the /student/badges and
 * /teacher/badges discovery pages. Every numeric here lines up with a
 * counter referenced in `lib/gamification/config.ts` and/or in the
 * `award_eligible_badges` PL/pgSQL function (migration 061) — if you
 * add a new unlock rule, extend this type + its query alongside.
 */
export interface BadgeProgress {
  earned: Set<string>;
  /** Epoch-ms map of earned_at per badge_type for the "since" line. */
  earnedAt: Record<string, number>;
  // Core counters
  lessonsCompleted: number;
  musicCompleted: number;
  conversations: number;
  currentStreak: number;
  totalXp: number;
  level: number;
  // Real minutes
  allMinutes: number;
  liveMinutes: number;
  lessonMinutes: number;
  songMinutes: number;
  speakingMinutes: number;
  // Teacher counters
  classroomsCreated: number;
  studentsAdded: number;
  assignmentsCreated: number;
  lessonsAuthored: number;
  classesTaught: number;
  certificatesIssued: number;
  studentsCertified: number;
  mentorGrants: number;
  // Session + exotic
  longestSessionSec: number;
  maxLessonsInDay: number;
  distinctActiveDays: number;
  profilePolishCount: number;
  // Weather
  maxTempSeen: number;
  heatwaveStreak: number;
  rainyStudyDays: number;
  // Profile flags (true = set)
  hasAvatar: boolean;
  hasBio: boolean;
  hasLocation: boolean;
  hasBirthday: boolean;
  hasSignature: boolean;
  hasLogo: boolean;
  hasFossyAttested: boolean;
  ageYears: number | null;
  founderRank: number | null;
}

export async function getBadgeProgress(
  userId?: string,
): Promise<BadgeProgress | null> {
  const supabase = await createClient();
  let target = userId;
  if (!target) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    target = user.id;
  }

  const admin = createAdminClient();

  // ── Parallel fetches where possible ──────────────────────────
  const [
    lessonRows,
    xpRows,
    activityRows,
    badgeRows,
    profileRow,
    realMinutesRow,
    classroomsCnt,
    studentsCnt,
    assignmentsCnt,
    authoredCnt,
    classesCnt,
    certsCnt,
    certsDistinct,
    mentorCnt,
    dailyHotRows,
    heartbeatRows,
    maxTempRow,
    founderRankRow,
  ] = await Promise.all([
    admin.from("lesson_progress").select("lesson_slug, completed_at").eq("student_id", target).not("completed_at", "is", null),
    admin.from("xp_events").select("xp_amount, source").eq("student_id", target).limit(50_000),
    admin.from("daily_activity").select("activity_date").eq("student_id", target).order("activity_date", { ascending: false }).limit(1000),
    admin.from("badges").select("badge_type, earned_at").eq("student_id", target),
    admin.from("profiles").select("avatar_url, bio, location, birthday, signature_url, signature_enabled, school_logo_url, fossy_attested_at").eq("id", target).maybeSingle(),
    admin.from("user_real_minutes_v").select("*").eq("user_id", target).maybeSingle(),
    admin.from("classrooms").select("*", { count: "exact", head: true }).eq("teacher_id", target),
    admin.from("roster_students").select("*", { count: "exact", head: true }).eq("teacher_id", target).is("deleted_at", null),
    admin.from("lesson_assignments").select("*", { count: "exact", head: true }).eq("assigned_by", target),
    admin.from("teacher_lessons").select("*", { count: "exact", head: true }).eq("teacher_id", target).eq("published", true),
    admin.from("student_history").select("*", { count: "exact", head: true }).eq("teacher_id", target).eq("status", "Done"),
    admin.from("certificates").select("*", { count: "exact", head: true }).eq("teacher_id", target),
    admin.from("certificates").select("roster_student_id").eq("teacher_id", target),
    admin.from("xp_events").select("*", { count: "exact", head: true }).eq("student_id", target).like("source", "mentor_%"),
    admin.from("weather_observations").select("temp_c, observed_at").eq("user_id", target),
    admin.from("session_heartbeats").select("at, seconds").eq("user_id", target).order("at", { ascending: true }).limit(20_000),
    admin.from("weather_observations").select("temp_c").eq("user_id", target).order("temp_c", { ascending: false }).limit(1).maybeSingle(),
    admin.rpc("profile_founder_rank", { p_id: target }),
  ]);

  const lessonsCompleted = (lessonRows.data ?? []).filter(
    (r: { lesson_slug: string }) => !r.lesson_slug.startsWith("music:"),
  ).length;
  const musicCompleted = (lessonRows.data ?? []).filter(
    (r: { lesson_slug: string }) => r.lesson_slug.startsWith("music:"),
  ).length;
  const totalXp =
    (xpRows.data ?? []).reduce(
      (s: number, e: { xp_amount: number }) => s + (e.xp_amount ?? 0),
      0,
    ) ?? 0;
  const conversations = (xpRows.data ?? []).filter(
    (e: { source: string }) => e.source === "ai_chat",
  ).length;
  const currentStreak = computeStreak(
    (activityRows.data ?? []) as { activity_date: string }[],
  );
  const level = getLevel(totalXp);

  const earned = new Set<string>();
  const earnedAt: Record<string, number> = {};
  for (const b of (badgeRows.data ?? []) as Array<{ badge_type: string; earned_at: string }>) {
    earned.add(b.badge_type);
    earnedAt[b.badge_type] = new Date(b.earned_at).getTime();
  }

  const profile = (profileRow.data ?? {}) as {
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    birthday: string | null;
    signature_url: string | null;
    signature_enabled: boolean | null;
    school_logo_url: string | null;
    fossy_attested_at: string | null;
  };
  const hasAvatar = !!profile.avatar_url;
  const hasBio = !!profile.bio;
  const hasLocation = !!profile.location;
  const hasBirthday = !!profile.birthday;
  const hasSignature = !!profile.signature_url && profile.signature_enabled === true;
  const hasLogo = !!profile.school_logo_url;
  const hasFossyAttested = !!profile.fossy_attested_at;
  const ageYears = profile.birthday
    ? Math.floor(
        (Date.now() - new Date(profile.birthday).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;
  const profilePolishCount = [
    hasAvatar, hasBio, hasLocation, hasBirthday, hasSignature, hasLogo,
  ].filter(Boolean).length;

  const rm = (realMinutesRow.data ?? {}) as Partial<Record<
    "heartbeat_minutes" | "live_class_minutes" | "lesson_minutes" | "song_minutes" | "speaking_minutes",
    number
  >>;
  const liveMinutes = rm.live_class_minutes ?? 0;
  const lessonMinutes = rm.lesson_minutes ?? 0;
  const songMinutes = rm.song_minutes ?? 0;
  const speakingMinutes = rm.speaking_minutes ?? 0;
  const allMinutes =
    (rm.heartbeat_minutes ?? 0) + liveMinutes + lessonMinutes + songMinutes + speakingMinutes;

  // Longest continuous session (islands-and-gaps) from heartbeat rows.
  const heartbeats = (heartbeatRows.data ?? []) as Array<{
    at: string;
    seconds: number;
  }>;
  let longestSessionSec = 0;
  {
    let island = 0;
    const bySession = new Map<number, number>();
    let prev: number | null = null;
    for (const hb of heartbeats) {
      const t = new Date(hb.at).getTime();
      if (prev == null || t - prev > 5 * 60 * 1000) island++;
      bySession.set(island, (bySession.get(island) ?? 0) + hb.seconds);
      prev = t;
    }
    for (const sec of bySession.values())
      if (sec > longestSessionSec) longestSessionSec = sec;
  }

  // Max lessons in a single day.
  const maxLessonsInDay = (() => {
    const byDay = new Map<string, number>();
    for (const r of (lessonRows.data ?? []) as Array<{ completed_at: string }>) {
      const d = r.completed_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    let m = 0;
    for (const v of byDay.values()) if (v > m) m = v;
    return m;
  })();

  const distinctActiveDays = new Set(
    ((activityRows.data ?? []) as { activity_date: string }[]).map(
      (r) => r.activity_date,
    ),
  ).size;

  const tempRows = (maxTempRow.data ?? null) as { temp_c: number | null } | null;
  const maxTempSeen = tempRows?.temp_c ?? 0;

  // Heatwave streak + rainy study days — derived from weather_observations + daily_activity
  const weatherRows = (dailyHotRows.data ?? []) as Array<{
    temp_c: number;
    observed_at: string;
  }>;
  const dailyMaxTemp = new Map<string, number>();
  for (const w of weatherRows) {
    const d = w.observed_at.slice(0, 10);
    const cur = dailyMaxTemp.get(d) ?? -999;
    if (w.temp_c > cur) dailyMaxTemp.set(d, w.temp_c);
  }
  const hotDays = [...dailyMaxTemp.entries()]
    .filter(([, t]) => t >= 35)
    .map(([d]) => d)
    .sort();
  let heatwaveStreak = 0;
  let run = 0;
  let prevDay: Date | null = null;
  for (const d of hotDays) {
    const cur = new Date(`${d}T12:00:00Z`);
    if (prevDay && (cur.getTime() - prevDay.getTime()) / 86_400_000 === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > heatwaveStreak) heatwaveStreak = run;
    prevDay = cur;
  }
  const rainyStudyDays = 0; // Left to DB-authoritative path; discovery page shows ✗/✓ only.

  return {
    earned,
    earnedAt,
    lessonsCompleted,
    musicCompleted,
    conversations,
    currentStreak,
    totalXp,
    level,
    allMinutes,
    liveMinutes,
    lessonMinutes,
    songMinutes,
    speakingMinutes,
    classroomsCreated: classroomsCnt.count ?? 0,
    studentsAdded: studentsCnt.count ?? 0,
    assignmentsCreated: assignmentsCnt.count ?? 0,
    lessonsAuthored: authoredCnt.count ?? 0,
    classesTaught: classesCnt.count ?? 0,
    certificatesIssued: certsCnt.count ?? 0,
    studentsCertified: new Set(
      ((certsDistinct.data ?? []) as { roster_student_id: string }[]).map(
        (r) => r.roster_student_id,
      ),
    ).size,
    mentorGrants: mentorCnt.count ?? 0,
    longestSessionSec,
    maxLessonsInDay,
    distinctActiveDays,
    profilePolishCount,
    maxTempSeen,
    heatwaveStreak,
    rainyStudyDays,
    hasAvatar,
    hasBio,
    hasLocation,
    hasBirthday,
    hasSignature,
    hasLogo,
    hasFossyAttested,
    ageYears,
    founderRank: (founderRankRow.data as number | null) ?? null,
  };
}
