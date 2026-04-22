export const XP_REWARDS = {
  // Student-facing
  LESSON_COMPLETE: 25,
  AI_CHAT_5_MESSAGES: 10,
  AI_CHAT_20_MESSAGES: 25,
  STREAK_BONUS_7_DAYS: 50,
  STREAK_BONUS_30_DAYS: 200,
  // Teacher-facing (matches xp_events.source values in migration 061)
  TEACHER_ASSIGN: 5,
  TEACHER_AUTHOR: 40,
  TEACHER_MUSIC: 20,
  TEACHER_SCHEDULE: 10,
  TEACHER_TEACH: 30,
  TEACHER_CERTIFY: 50,
  TEACHER_POLISH: 5,
  MENTOR_LESSON: 3,
  MENTOR_LEVEL: 25,
  MENTOR_CERTIFY: 100,
} as const;

export const LEVEL_THRESHOLDS = {
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 60,
} as const;

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/** Who this badge is available to. `both` means any profile can earn it. */
export type BadgeAudience = "student" | "teacher" | "both";

/** Difficulty tier — drives grouping on the discovery page. */
export type BadgeTier = "easy" | "medium" | "medium_plus" | "hard" | "very_hard";

/**
 * Human-facing theme used to group cards on the discovery page. Keep
 * the count small — one theme per row feels great; twenty don't.
 */
export type BadgeTheme =
  | "milestones"
  | "streaks"
  | "levels"
  | "real_hours"
  | "music"
  | "speaking"
  | "chat"
  | "profile"
  | "teacher_legacy"
  | "teacher_artisan"
  | "easter_eggs"
  | "cefr";

export type BadgeUnlockRule =
  | { kind: "auto" }
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "count"; counter: string; threshold: number }
  | {
      kind: "hours";
      source: "all" | "live" | "lessons" | "songs" | "speaking";
      hours: number;
    }
  | {
      kind: "profile_flag";
      flag:
        | "signature"
        | "logo"
        | "avatar"
        | "bio"
        | "location"
        | "birthday"
        | "fossy_attested";
    }
  | { kind: "age"; years: number }
  | {
      kind: "calendar";
      window: "new_year" | "christmas" | "festa_junina";
    }
  | { kind: "founder"; maxRank: number }
  | { kind: "composite"; description: string };

export interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  unlock: BadgeUnlockRule;
  rarity: BadgeRarity;
  tier: BadgeTier;
  audience: BadgeAudience;
  theme: BadgeTheme;
  gradient: string;
  glow: string;
}

/* ------------------------------------------------------------------ */
/* Visual presets — keep gradients consistent per tier + theme         */
/* ------------------------------------------------------------------ */
const GRAD = {
  common:    "from-sky-400 via-indigo-500 to-violet-600",
  milestone: "from-emerald-400 via-teal-500 to-cyan-600",
  streak:    "from-orange-400 via-red-500 to-rose-600",
  level:     "from-cyan-400 via-sky-500 to-indigo-600",
  hours:     "from-amber-300 via-orange-400 to-rose-500",
  music:     "from-pink-400 via-rose-500 to-red-500",
  speaking:  "from-teal-300 via-emerald-500 to-cyan-600",
  chat:      "from-fuchsia-400 via-purple-500 to-indigo-600",
  profile:   "from-lime-400 via-green-500 to-emerald-600",
  legacy:    "from-indigo-500 via-violet-600 to-fuchsia-600",
  artisan:   "from-amber-400 via-orange-500 to-red-600",
  easter:    "from-fuchsia-500 via-pink-500 to-rose-500",
  cefr_warm: "from-sky-400 via-blue-500 to-indigo-600",
  cefr_mid:  "from-emerald-400 via-teal-500 to-cyan-600",
  cefr_end:  "from-yellow-300 via-amber-400 to-orange-500",
  crown:     "from-yellow-300 via-amber-400 to-orange-500",
} as const;

const GLOW = {
  low:    "shadow-[0_0_22px_-6px_rgba(99,102,241,0.65)]",
  med:    "shadow-[0_0_28px_-4px_rgba(139,92,246,0.85)]",
  high:   "shadow-[0_0_34px_-2px_rgba(217,70,239,0.95)]",
  crown:  "shadow-[0_0_44px_0px_rgba(252,211,77,1)]",
  streak: "shadow-[0_0_30px_-4px_rgba(239,68,68,0.9)]",
} as const;

/**
 * Catalog. Every badge MUST also appear in migration 061's
 * award_eligible_badges function with a matching `type` string —
 * otherwise it will never be inserted into the DB. If you add a new
 * unlock kind here, add the corresponding SQL branch too.
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ═══ Milestones — core engagement (both audiences) ═══════════════
  { type: "welcome_aboard", name: "First Contact", description: "Joined Amazing School — welcome!", icon: "🚀", unlock: { kind: "auto" }, rarity: "common", tier: "easy", audience: "both", theme: "milestones", gradient: GRAD.common, glow: GLOW.low },
  { type: "first_lesson",   name: "First Signal", description: "Completed your first lesson", icon: "🎯", unlock: { kind: "count", counter: "lessons_completed", threshold: 1 }, rarity: "common", tier: "easy", audience: "both", theme: "milestones", gradient: GRAD.milestone, glow: GLOW.low },
  { type: "five_lessons",   name: "Momentum", description: "Completed 5 lessons", icon: "📚", unlock: { kind: "count", counter: "lessons_completed", threshold: 5 }, rarity: "common", tier: "easy", audience: "both", theme: "milestones", gradient: GRAD.milestone, glow: GLOW.low },
  { type: "ten_lessons",    name: "Accelerating", description: "Completed 10 lessons", icon: "⚙️", unlock: { kind: "count", counter: "lessons_completed", threshold: 10 }, rarity: "common", tier: "medium", audience: "both", theme: "milestones", gradient: GRAD.milestone, glow: GLOW.med },
  { type: "bookworm",       name: "Bookworm", description: "Completed 25 lessons", icon: "📖", unlock: { kind: "count", counter: "lessons_completed", threshold: 25 }, rarity: "rare", tier: "medium", audience: "both", theme: "milestones", gradient: "from-rose-400 via-pink-500 to-fuchsia-600", glow: GLOW.med },
  { type: "fifty_lessons",  name: "Pathfinder", description: "Completed 50 lessons", icon: "🧭", unlock: { kind: "count", counter: "lessons_completed", threshold: 50 }, rarity: "rare", tier: "medium_plus", audience: "both", theme: "milestones", gradient: GRAD.milestone, glow: GLOW.med },
  { type: "hundred_lessons", name: "Century", description: "Completed 100 lessons", icon: "💯", unlock: { kind: "count", counter: "lessons_completed", threshold: 100 }, rarity: "epic", tier: "hard", audience: "both", theme: "milestones", gradient: GRAD.milestone, glow: GLOW.high },
  { type: "two_fifty_lessons", name: "Voyager", description: "Completed 250 lessons", icon: "🛸", unlock: { kind: "count", counter: "lessons_completed", threshold: 250 }, rarity: "epic", tier: "hard", audience: "both", theme: "milestones", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "five_hundred_lessons", name: "Wayfarer", description: "Completed 500 lessons", icon: "🏔️", unlock: { kind: "count", counter: "lessons_completed", threshold: 500 }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "milestones", gradient: GRAD.legacy, glow: GLOW.crown },
  { type: "one_thousand_lessons", name: "Archon", description: "Completed 1000 lessons", icon: "👑", unlock: { kind: "count", counter: "lessons_completed", threshold: 1000 }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "milestones", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ Chat ════════════════════════════════════════════════════════
  { type: "first_chat",  name: "Neural Handshake", description: "Started your first AI conversation", icon: "💬", unlock: { kind: "count", counter: "conversations", threshold: 1 }, rarity: "common", tier: "easy", audience: "both", theme: "chat", gradient: GRAD.chat, glow: GLOW.low },
  { type: "ten_chats",   name: "Conversationalist", description: "Started 10 AI conversations", icon: "🗨️", unlock: { kind: "count", counter: "conversations", threshold: 10 }, rarity: "rare", tier: "medium", audience: "both", theme: "chat", gradient: GRAD.chat, glow: GLOW.med },
  { type: "hundred_chats", name: "Interlocutor", description: "Started 100 AI conversations", icon: "🧠", unlock: { kind: "count", counter: "conversations", threshold: 100 }, rarity: "epic", tier: "hard", audience: "both", theme: "chat", gradient: GRAD.chat, glow: GLOW.high },

  // ═══ Music ═══════════════════════════════════════════════════════
  { type: "first_song",   name: "Opening Chord", description: "Completed your first song", icon: "🎵", unlock: { kind: "count", counter: "music_completed", threshold: 1 }, rarity: "common", tier: "easy", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.low },
  { type: "five_songs",   name: "Playlist Starter", description: "Completed 5 songs", icon: "🎶", unlock: { kind: "count", counter: "music_completed", threshold: 5 }, rarity: "common", tier: "easy", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.low },
  { type: "music_lover",  name: "Soundwave", description: "Completed 5 music lessons", icon: "🎧", unlock: { kind: "count", counter: "music_completed", threshold: 5 }, rarity: "rare", tier: "medium", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.med },
  { type: "twenty_songs", name: "Mixtape", description: "Completed 20 songs", icon: "📻", unlock: { kind: "count", counter: "music_completed", threshold: 20 }, rarity: "rare", tier: "medium_plus", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.med },
  { type: "fifty_songs",  name: "Album Artist", description: "Completed 50 songs", icon: "💿", unlock: { kind: "count", counter: "music_completed", threshold: 50 }, rarity: "epic", tier: "hard", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.high },
  { type: "hundred_songs", name: "Platinum Record", description: "Completed 100 songs", icon: "🏆", unlock: { kind: "count", counter: "music_completed", threshold: 100 }, rarity: "legendary", tier: "very_hard", audience: "student", theme: "music", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ Streaks ═════════════════════════════════════════════════════
  { type: "streak_3",   name: "Getting Warm", description: "3-day streak", icon: "🔆", unlock: { kind: "streak", days: 3 }, rarity: "common", tier: "easy", audience: "both", theme: "streaks", gradient: GRAD.streak, glow: GLOW.low },
  { type: "streak_7",   name: "Ignited", description: "7-day streak", icon: "🔥", unlock: { kind: "streak", days: 7 }, rarity: "rare", tier: "medium", audience: "both", theme: "streaks", gradient: GRAD.streak, glow: GLOW.streak },
  { type: "streak_14",  name: "Kindled", description: "14-day streak", icon: "🔥", unlock: { kind: "streak", days: 14 }, rarity: "rare", tier: "medium", audience: "both", theme: "streaks", gradient: GRAD.streak, glow: GLOW.streak },
  { type: "streak_30",  name: "Unstoppable", description: "30-day streak", icon: "⚡", unlock: { kind: "streak", days: 30 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "streaks", gradient: "from-yellow-400 via-amber-500 to-orange-600", glow: GLOW.high },
  { type: "streak_60",  name: "Combustion", description: "60-day streak", icon: "☄️", unlock: { kind: "streak", days: 60 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "streaks", gradient: GRAD.streak, glow: GLOW.high },
  { type: "streak_90",  name: "Quarter Orbit", description: "90-day streak", icon: "🌌", unlock: { kind: "streak", days: 90 }, rarity: "legendary", tier: "hard", audience: "both", theme: "streaks", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "streak_180", name: "Half Year Halo", description: "180-day streak", icon: "💫", unlock: { kind: "streak", days: 180 }, rarity: "legendary", tier: "hard", audience: "both", theme: "streaks", gradient: GRAD.legacy, glow: GLOW.crown },
  { type: "streak_365", name: "Full Circle", description: "365-day streak — one full year", icon: "🌟", unlock: { kind: "streak", days: 365 }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "streaks", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ Levels ══════════════════════════════════════════════════════
  { type: "level_2",  name: "Spark", description: "Reached Level 2", icon: "⭐", unlock: { kind: "level", level: 2 }, rarity: "common", tier: "easy", audience: "both", theme: "levels", gradient: GRAD.level, glow: GLOW.low },
  { type: "level_3",  name: "Flare", description: "Reached Level 3", icon: "⭐", unlock: { kind: "level", level: 3 }, rarity: "common", tier: "easy", audience: "both", theme: "levels", gradient: GRAD.level, glow: GLOW.low },
  { type: "level_5",  name: "Rising Signal", description: "Reached Level 5", icon: "⭐", unlock: { kind: "level", level: 5 }, rarity: "common", tier: "medium", audience: "both", theme: "levels", gradient: GRAD.level, glow: GLOW.med },
  { type: "level_10", name: "Constellation", description: "Reached Level 10", icon: "🌟", unlock: { kind: "level", level: 10 }, rarity: "rare", tier: "medium_plus", audience: "both", theme: "levels", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "level_15", name: "Pulsar", description: "Reached Level 15", icon: "💫", unlock: { kind: "level", level: 15 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "levels", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "level_25", name: "Nova", description: "Reached Level 25", icon: "🌠", unlock: { kind: "level", level: 25 }, rarity: "epic", tier: "hard", audience: "both", theme: "levels", gradient: "from-fuchsia-500 via-pink-500 to-rose-500", glow: GLOW.high },
  { type: "level_50", name: "Supernova", description: "Reached Level 50", icon: "✨", unlock: { kind: "level", level: 50 }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "levels", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ Real hours (time spent on the platform — all measurable) ═══
  // Thresholds anchored to CEFR's industry convention: 40h = 1 semester,
  // 80h = 1 academic year, 240h = 2 CEFR years, 480h = C1/C2-level
  // total exposure.
  { type: "hours_1",   name: "One Hour In", description: "Spent your first hour on the platform", icon: "⏱️", unlock: { kind: "hours", source: "all", hours: 1 }, rarity: "common", tier: "easy", audience: "both", theme: "real_hours", gradient: GRAD.hours, glow: GLOW.low },
  { type: "hours_5",   name: "Five-Hour Run", description: "5 real hours logged", icon: "⏲️", unlock: { kind: "hours", source: "all", hours: 5 }, rarity: "common", tier: "easy", audience: "both", theme: "real_hours", gradient: GRAD.hours, glow: GLOW.low },
  { type: "hours_10",  name: "Ten-Hour Mark", description: "10 real hours logged", icon: "🕙", unlock: { kind: "hours", source: "all", hours: 10 }, rarity: "rare", tier: "medium", audience: "both", theme: "real_hours", gradient: GRAD.hours, glow: GLOW.med },
  { type: "hours_25",  name: "Quarter Century", description: "25 real hours — getting serious", icon: "📊", unlock: { kind: "hours", source: "all", hours: 25 }, rarity: "rare", tier: "medium", audience: "both", theme: "real_hours", gradient: GRAD.hours, glow: GLOW.med },
  { type: "hours_40",  name: "CEFR Semester", description: "40 real hours — one industry-standard semester", icon: "🎓", unlock: { kind: "hours", source: "all", hours: 40 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "real_hours", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "hours_80",  name: "Academic Year", description: "80 real hours — one CEFR year", icon: "📅", unlock: { kind: "hours", source: "all", hours: 80 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "real_hours", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "hours_120", name: "Scholar", description: "120 real hours", icon: "🎒", unlock: { kind: "hours", source: "all", hours: 120 }, rarity: "epic", tier: "hard", audience: "both", theme: "real_hours", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "hours_240", name: "Two-Year Resident", description: "240 real hours — two CEFR years", icon: "🏛️", unlock: { kind: "hours", source: "all", hours: 240 }, rarity: "legendary", tier: "hard", audience: "both", theme: "real_hours", gradient: GRAD.legacy, glow: GLOW.crown },
  { type: "hours_480", name: "Four Semesters Deep", description: "480 real hours — four CEFR semesters of measurable time", icon: "📯", unlock: { kind: "hours", source: "all", hours: 480 }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "real_hours", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ Speaking lab ════════════════════════════════════════════════
  { type: "speaking_hour", name: "First Speech", description: "1 hour of speaking-lab time", icon: "🎙️", unlock: { kind: "hours", source: "speaking", hours: 1 }, rarity: "rare", tier: "medium", audience: "student", theme: "speaking", gradient: GRAD.speaking, glow: GLOW.med },
  { type: "speaking_10h",  name: "Orator", description: "10 hours of speaking-lab time", icon: "🗣️", unlock: { kind: "hours", source: "speaking", hours: 10 }, rarity: "epic", tier: "hard", audience: "student", theme: "speaking", gradient: GRAD.speaking, glow: GLOW.high },

  // ═══ Listening / songs deep tier ═════════════════════════════════
  { type: "listening_5h", name: "Trained Ear", description: "5 hours listening to songs on the platform", icon: "👂", unlock: { kind: "hours", source: "songs", hours: 5 }, rarity: "rare", tier: "medium", audience: "student", theme: "music", gradient: GRAD.music, glow: GLOW.med },

  // ═══ Profile polish ══════════════════════════════════════════════
  { type: "profile_avatar",    name: "Face Forward", description: "Uploaded a profile photo", icon: "🪞", unlock: { kind: "profile_flag", flag: "avatar" }, rarity: "common", tier: "easy", audience: "both", theme: "profile", gradient: GRAD.profile, glow: GLOW.low },
  { type: "profile_bio",       name: "Introduced", description: "Wrote a bio on your profile", icon: "📝", unlock: { kind: "profile_flag", flag: "bio" }, rarity: "common", tier: "easy", audience: "both", theme: "profile", gradient: GRAD.profile, glow: GLOW.low },
  { type: "profile_location",  name: "On The Map", description: "Added your city to your profile", icon: "📍", unlock: { kind: "profile_flag", flag: "location" }, rarity: "common", tier: "easy", audience: "both", theme: "profile", gradient: GRAD.profile, glow: GLOW.low },
  { type: "profile_birthday",  name: "Cake Calibrated", description: "Registered your birthday", icon: "🎂", unlock: { kind: "profile_flag", flag: "birthday" }, rarity: "common", tier: "easy", audience: "both", theme: "profile", gradient: GRAD.profile, glow: GLOW.low },
  { type: "teacher_signature", name: "Signed, Sealed", description: "Enabled your teacher signature", icon: "✒️", unlock: { kind: "profile_flag", flag: "signature" }, rarity: "rare", tier: "easy", audience: "teacher", theme: "profile", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_logo",      name: "Your Brand", description: "Uploaded your school logo", icon: "🏫", unlock: { kind: "profile_flag", flag: "logo" }, rarity: "rare", tier: "easy", audience: "teacher", theme: "profile", gradient: GRAD.legacy, glow: GLOW.med },

  // ═══ Teacher legacy — assignment + student ladder ═══════════════
  { type: "teacher_first_classroom",   name: "Opened the Doors", description: "Created your first classroom", icon: "🚪", unlock: { kind: "count", counter: "classrooms_created", threshold: 1 }, rarity: "common", tier: "easy", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.low },
  { type: "teacher_three_classrooms",  name: "Wing", description: "Running 3 classrooms", icon: "🏛️", unlock: { kind: "count", counter: "classrooms_created", threshold: 3 }, rarity: "rare", tier: "medium", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_first_student",     name: "First Pupil", description: "Added your first student", icon: "🌱", unlock: { kind: "count", counter: "students_added", threshold: 1 }, rarity: "common", tier: "easy", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.low },
  { type: "teacher_ten_students",      name: "Class of Ten", description: "Teaching 10 students", icon: "👥", unlock: { kind: "count", counter: "students_added", threshold: 10 }, rarity: "rare", tier: "medium", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_fifty_students",    name: "Full Room", description: "Teaching 50 students", icon: "🎒", unlock: { kind: "count", counter: "students_added", threshold: 50 }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "teacher_hundred_students",  name: "Mentor", description: "Teaching 100 students", icon: "🏅", unlock: { kind: "count", counter: "students_added", threshold: 100 }, rarity: "legendary", tier: "hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.crown },
  { type: "teacher_first_task",        name: "First Assignment", description: "Assigned your first lesson", icon: "📋", unlock: { kind: "count", counter: "assignments_created", threshold: 1 }, rarity: "common", tier: "easy", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.low },
  { type: "teacher_ten_tasks",         name: "Task Master", description: "Created 10 assignments", icon: "🗂️", unlock: { kind: "count", counter: "assignments_created", threshold: 10 }, rarity: "common", tier: "medium", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_fifty_tasks",       name: "Curator", description: "Created 50 assignments", icon: "📚", unlock: { kind: "count", counter: "assignments_created", threshold: 50 }, rarity: "rare", tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_hundred_tasks",     name: "Conductor", description: "Created 100 assignments", icon: "🎼", unlock: { kind: "count", counter: "assignments_created", threshold: 100 }, rarity: "epic", tier: "hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "teacher_five_hundred_tasks", name: "Quartermaster", description: "Created 500 assignments", icon: "⚓", unlock: { kind: "count", counter: "assignments_created", threshold: 500 }, rarity: "legendary", tier: "very_hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.crown, glow: GLOW.crown },
  { type: "teacher_first_class",       name: "Bell Rings", description: "Taught your first live class", icon: "🔔", unlock: { kind: "count", counter: "classes_taught", threshold: 1 }, rarity: "common", tier: "easy", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.low },
  { type: "teacher_ten_classes",       name: "Roll Call", description: "Taught 10 live classes", icon: "📣", unlock: { kind: "count", counter: "classes_taught", threshold: 10 }, rarity: "rare", tier: "medium", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.med },
  { type: "teacher_fifty_classes",     name: "Seasoned", description: "Taught 50 live classes", icon: "🧑‍🏫", unlock: { kind: "count", counter: "classes_taught", threshold: 50 }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.high },
  { type: "teacher_hundred_classes",   name: "Centurion Teacher", description: "Taught 100 live classes", icon: "🏛️", unlock: { kind: "count", counter: "classes_taught", threshold: 100 }, rarity: "legendary", tier: "hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.legacy, glow: GLOW.crown },

  // ═══ Teacher artisan — authoring + certifying ═══════════════════
  { type: "teacher_first_authored",     name: "First Draft", description: "Published your first authored lesson", icon: "🖋️", unlock: { kind: "count", counter: "lessons_authored", threshold: 1 }, rarity: "common", tier: "easy", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.low },
  { type: "teacher_five_authored",      name: "Shelf Started", description: "Published 5 authored lessons", icon: "📕", unlock: { kind: "count", counter: "lessons_authored", threshold: 5 }, rarity: "rare", tier: "medium", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.med },
  { type: "teacher_twenty_five_authored", name: "Textbook", description: "Published 25 authored lessons", icon: "📘", unlock: { kind: "count", counter: "lessons_authored", threshold: 25 }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.high },
  { type: "teacher_first_cert",         name: "First Honors", description: "Issued your first certificate", icon: "📜", unlock: { kind: "count", counter: "certificates_issued", threshold: 1 }, rarity: "rare", tier: "easy", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.med },
  { type: "teacher_ten_certs",          name: "Commencement", description: "Issued 10 certificates", icon: "🎓", unlock: { kind: "count", counter: "certificates_issued", threshold: 10 }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.high },
  { type: "teacher_fifty_certs",        name: "Provost", description: "Issued 50 certificates", icon: "🏛️", unlock: { kind: "count", counter: "certificates_issued", threshold: 50 }, rarity: "legendary", tier: "hard", audience: "teacher", theme: "teacher_artisan", gradient: GRAD.artisan, glow: GLOW.crown },

  // ═══ Easter eggs & pop-culture ══════════════════════════════════
  { type: "answer_to_everything", name: "The Answer", description: "Turned 42 on the platform", icon: "🐬", unlock: { kind: "age", years: 42 }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: GRAD.easter, glow: GLOW.crown },
  { type: "y2k_login",           name: "Y2K", description: "Logged in on January 1st", icon: "🎆", unlock: { kind: "calendar", window: "new_year" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: GRAD.easter, glow: GLOW.med },
  { type: "yule_log",            name: "Yule Log", description: "Logged in on Christmas Day", icon: "🎄", unlock: { kind: "calendar", window: "christmas" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: GRAD.easter, glow: GLOW.med },
  { type: "festa_junina",        name: "Festa Junina", description: "Active during Brazilian Festa Junina week (Jun 20–30)", icon: "🎆", unlock: { kind: "calendar", window: "festa_junina" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: GRAD.easter, glow: GLOW.med },
  { type: "founding_100",        name: "Founding 100", description: "Among the first 100 users on the platform", icon: "🕯️", unlock: { kind: "founder", maxRank: 100 }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: GRAD.crown, glow: GLOW.crown },
  { type: "founding_500",        name: "Founding 500", description: "Among the first 500 users on the platform", icon: "🗝️", unlock: { kind: "founder", maxRank: 500 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: GRAD.easter, glow: GLOW.high },
  { type: "open_source_patron",  name: "Open-Source Patron", description: "Self-attested support for the open-source project", icon: "🦾", unlock: { kind: "profile_flag", flag: "fossy_attested" }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: GRAD.legacy, glow: GLOW.high },

  // ═══ Very hard — crown achievements ═════════════════════════════
  { type: "god_of_free_education", name: "God/Goddess of Free Education", description: "Taught 100+ live classes and issued 10+ certificates", icon: "🏵️", unlock: { kind: "composite", description: "100 live classes taught AND 10 certificates issued" }, rarity: "mythic", tier: "very_hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.crown, glow: GLOW.crown },
  { type: "freire",                name: "Freire", description: "Certified 25 distinct students — Paulo Freire's legacy", icon: "🌅", unlock: { kind: "count", counter: "students_certified", threshold: 25 }, rarity: "mythic", tier: "very_hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.crown, glow: GLOW.crown },

  // ═══ CEFR certificates (issued via /print/certificate) ══════════
  { type: "cert_a1", name: "Ignição", description: "Certificado CEFR A1 · Iniciante", icon: "🚀", unlock: { kind: "auto" }, rarity: "common", tier: "medium", audience: "student", theme: "cefr", gradient: GRAD.cefr_warm, glow: GLOW.med },
  { type: "cert_a2", name: "Órbita", description: "Certificado CEFR A2 · Pré-Intermediário", icon: "📡", unlock: { kind: "auto" }, rarity: "rare", tier: "medium_plus", audience: "student", theme: "cefr", gradient: "from-violet-400 via-purple-500 to-fuchsia-600", glow: GLOW.med },
  { type: "cert_b1", name: "Trajetória", description: "Certificado CEFR B1 · Intermediário", icon: "🛰️", unlock: { kind: "auto" }, rarity: "rare", tier: "hard", audience: "student", theme: "cefr", gradient: GRAD.cefr_mid, glow: GLOW.high },
  { type: "cert_b2", name: "Navegador", description: "Certificado CEFR B2 · Intermediário Superior", icon: "🧭", unlock: { kind: "auto" }, rarity: "epic", tier: "hard", audience: "student", theme: "cefr", gradient: "from-amber-400 via-orange-500 to-red-500", glow: GLOW.high },
  { type: "cert_c1", name: "Maestria", description: "Certificado CEFR C1 · Avançado", icon: "👑", unlock: { kind: "auto" }, rarity: "epic", tier: "very_hard", audience: "student", theme: "cefr", gradient: "from-fuchsia-500 via-pink-500 to-rose-600", glow: GLOW.high },
  { type: "cert_c2", name: "Proficiência", description: "Certificado CEFR C2 · Proficiente", icon: "🌌", unlock: { kind: "auto" }, rarity: "mythic", tier: "very_hard", audience: "student", theme: "cefr", gradient: GRAD.cefr_end, glow: GLOW.crown },

  // ═══ Perfect lessons — kept for when completed_exercises is wired ═
  { type: "perfect_lesson", name: "Clean Sweep", description: "Finished a lesson with zero mistakes", icon: "💎", unlock: { kind: "count", counter: "perfect_lessons", threshold: 1 }, rarity: "rare", tier: "hard", audience: "student", theme: "milestones", gradient: "from-teal-300 via-emerald-500 to-cyan-600", glow: GLOW.high },

  // ═══ Game of Classrooms — GoT-themed "radical attitude" pack ════
  // Unlocked by slightly radical behavior: never-quit streaks,
  // no-help runs, off-season grinds, monstrous volume. Mix of both
  // audiences so students and teachers can chase the same iconography.
  { type: "the_wall",                     name: "The Wall", description: "A 100-day streak. The Watch never ends.", icon: "❄️", unlock: { kind: "streak", days: 100 }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-sky-300 via-cyan-400 to-slate-500", glow: GLOW.high },
  { type: "winterfell_watch",             name: "Winterfell Watch", description: "50 lessons completed during Brazilian winter (Jun–Aug) — stayed in the grind when the realm hibernated", icon: "🐺", unlock: { kind: "composite", description: "50+ lessons completed in June, July, or August" }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: "from-slate-400 via-zinc-500 to-stone-600", glow: GLOW.high },
  { type: "mother_of_dragons",            name: "Mother of Dragons", description: "Hatched 3 classrooms and raised 25 students to bend the knee", icon: "🐉", unlock: { kind: "composite", description: "3+ classrooms created AND 25+ students added" }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: "from-rose-400 via-red-500 to-orange-600", glow: GLOW.high },
  { type: "hand_of_the_realm",            name: "Hand of the Realm", description: "100 mentor-XP grants earned — tireless service to your students", icon: "⚜️", unlock: { kind: "count", counter: "mentor_grants", threshold: 100 }, rarity: "epic", tier: "hard", audience: "teacher", theme: "teacher_legacy", gradient: "from-amber-300 via-yellow-500 to-orange-600", glow: GLOW.high },
  { type: "khaleesi_of_the_great_grass_sea", name: "Khaleesi of the Great Grass Sea", description: "240 real hours logged — a conqueror's patience", icon: "🐲", unlock: { kind: "hours", source: "all", hours: 240 }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-rose-400 via-fuchsia-500 to-violet-600", glow: GLOW.crown },
  { type: "valar_morghulis",              name: "Valar Morghulis", description: "Completed 1000 lessons — all men must serve", icon: "💀", unlock: { kind: "count", counter: "lessons_completed", threshold: 1000 }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-zinc-300 via-slate-500 to-neutral-800", glow: GLOW.crown },
  { type: "valar_dohaeris",               name: "Valar Dohaeris", description: "Issued 100 certificates — all men must serve", icon: "🎓", unlock: { kind: "count", counter: "certificates_issued", threshold: 100 }, rarity: "legendary", tier: "very_hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.crown, glow: GLOW.crown },
  { type: "iron_throne",                  name: "The Iron Throne", description: "100 live classes, 50 certificates, 100 students. The realm is yours.", icon: "🗡️", unlock: { kind: "composite", description: "100 classes taught AND 50 certificates issued AND 100 students added" }, rarity: "mythic", tier: "very_hard", audience: "teacher", theme: "teacher_legacy", gradient: GRAD.crown, glow: GLOW.crown },
  { type: "you_know_nothing",             name: "You Know Nothing", description: "Completed 100 lessons without asking the AI tutor once — ironclad stubbornness", icon: "⚔️", unlock: { kind: "composite", description: "100+ lessons AND 0 AI conversations" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-slate-500 via-zinc-600 to-gray-800", glow: GLOW.high },
  { type: "red_wedding",                  name: "Red Wedding", description: "Issued a certificate with grade C — honest grades, no mercy", icon: "🍷", unlock: { kind: "composite", description: "Issued at least one grade-C certificate" }, rarity: "rare", tier: "medium", audience: "teacher", theme: "easter_eggs", gradient: "from-red-500 via-rose-600 to-rose-800", glow: GLOW.streak },
  { type: "chaos_is_a_ladder",            name: "Chaos Is a Ladder", description: "Active on 25+ distinct days in a single month — climbed every rung", icon: "🪜", unlock: { kind: "composite", description: "25+ distinct active days in any single month" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-emerald-500 via-teal-600 to-slate-700", glow: GLOW.high },
  { type: "dracarys",                     name: "Dracarys", description: "Reached level 25 within 90 days of joining — blazing speed", icon: "🔥", unlock: { kind: "composite", description: "Reached level 25 in < 90 days since joining" }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-red-500 via-orange-500 to-yellow-500", glow: GLOW.crown },

  // ═══ Dragons — continuous single-session ladder ══════════════════
  // Longest uninterrupted stretch of focused time (no gap > 5 min).
  // Ladder named after Westerosi dragons from smallest → largest.
  { type: "dragon_egg",      name: "Dragon Egg", description: "One-hour straight study session", icon: "🥚", unlock: { kind: "composite", description: "60+ minutes of continuous focused time" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-amber-300 via-yellow-400 to-rose-400", glow: GLOW.med },
  { type: "dragon_wyvern",   name: "Wyvern", description: "Three-hour straight study session", icon: "🦎", unlock: { kind: "composite", description: "3+ hours of continuous focused time" }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: "from-lime-400 via-emerald-500 to-teal-600", glow: GLOW.high },
  { type: "dragon_drogon",   name: "Drogon", description: "Six-hour straight study session — the Unburnt's favorite", icon: "🐉", unlock: { kind: "composite", description: "6+ hours of continuous focused time" }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-red-500 via-rose-600 to-neutral-900", glow: GLOW.crown },
  { type: "dragon_vhagar",   name: "Vhagar", description: "Nine-hour straight study session — the second-largest dragon in Westeros history", icon: "🐲", unlock: { kind: "composite", description: "9+ hours of continuous focused time" }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-emerald-600 via-teal-700 to-slate-900", glow: GLOW.crown },
  { type: "dragon_balerion", name: "Balerion the Black Dread", description: "Twelve-hour straight study session — the largest dragon ever to rule Westeros", icon: "🌑", unlock: { kind: "composite", description: "12+ hours of continuous focused time" }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-slate-800 via-neutral-900 to-black", glow: GLOW.crown },

  // ═══ Sharpe — Cornwell's Napoleonic series ══════════════════════
  // Green-jacket theme: rise-from-the-ranks, tactical discipline, the
  // 95th Rifles ethos. Sergeant Harper's Volley Gun gets its own
  // 7-in-a-day badge. Chosen Men tips the cap to the elite squad.
  { type: "sharpe_tiger",       name: "Sharpe's Tiger", description: "Reached Level 3 — rose from the ranks", icon: "🐅", unlock: { kind: "level", level: 3 }, rarity: "common", tier: "easy", audience: "both", theme: "easter_eggs", gradient: "from-amber-500 via-orange-600 to-red-700", glow: GLOW.low },
  { type: "sharpe_triumph",     name: "Sharpe's Triumph", description: "Reached Level 5 — your first real victory", icon: "🎖️", unlock: { kind: "level", level: 5 }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-emerald-500 via-teal-600 to-green-700", glow: GLOW.med },
  { type: "sharpe_rifles",      name: "Sharpe's Rifles", description: "Completed 25 lessons — signal your corps", icon: "🔫", unlock: { kind: "count", counter: "lessons_completed", threshold: 25 }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-emerald-600 via-green-700 to-stone-800", glow: GLOW.med },
  { type: "sharpe_gold",        name: "Sharpe's Gold", description: "Accumulated 10,000 XP — a soldier's fortune", icon: "🪙", unlock: { kind: "composite", description: "10,000+ XP total" }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: "from-yellow-400 via-amber-500 to-yellow-700", glow: GLOW.high },
  { type: "sharpe_sword",       name: "Sharpe's Sword", description: "Completed 100 lessons — heavy-cavalry blade mastery", icon: "🗡️", unlock: { kind: "count", counter: "lessons_completed", threshold: 100 }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-slate-400 via-zinc-500 to-slate-700", glow: GLOW.high },
  { type: "sharpe_prey",        name: "Sharpe's Prey", description: "Started 10 AI conversations — the hunter and the hunted", icon: "🦊", unlock: { kind: "count", counter: "conversations", threshold: 10 }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-rose-500 via-red-600 to-stone-700", glow: GLOW.med },
  { type: "sharpe_escape",      name: "Sharpe's Escape", description: "Two-hour straight study session — broke from the trap", icon: "🏇", unlock: { kind: "composite", description: "2+ hours of continuous focused time" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-stone-400 via-amber-600 to-rose-700", glow: GLOW.med },
  { type: "sharpe_eagle",       name: "Sharpe's Eagle", description: "Issued your first certificate — an Eagle standard captured", icon: "🦅", unlock: { kind: "count", counter: "certificates_issued", threshold: 1 }, rarity: "rare", tier: "easy", audience: "teacher", theme: "easter_eggs", gradient: "from-amber-400 via-yellow-600 to-orange-700", glow: GLOW.med },
  { type: "sharpe_company",     name: "Sharpe's Company", description: "10 students under arms and 10 assignments given — a proper company", icon: "⚔️", unlock: { kind: "composite", description: "10+ students added AND 10+ assignments created" }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "easter_eggs", gradient: "from-emerald-600 via-teal-700 to-slate-800", glow: GLOW.high },
  { type: "sharpe_fortress",    name: "Sharpe's Fortress", description: "Running 5 classrooms — holding the ramparts", icon: "🏰", unlock: { kind: "count", counter: "classrooms_created", threshold: 5 }, rarity: "epic", tier: "medium_plus", audience: "teacher", theme: "easter_eggs", gradient: "from-stone-500 via-neutral-600 to-slate-800", glow: GLOW.high },
  { type: "sharpe_regiment",    name: "Sharpe's Regiment", description: "50 students across 3 classrooms — a regiment of your own", icon: "🎺", unlock: { kind: "composite", description: "50+ students AND 3+ classrooms" }, rarity: "legendary", tier: "hard", audience: "teacher", theme: "easter_eggs", gradient: "from-indigo-600 via-violet-700 to-slate-800", glow: GLOW.crown },
  { type: "sharpe_siege",       name: "Sharpe's Siege", description: "30-day streak with 50+ lessons — Badajoz-level endurance", icon: "🧱", unlock: { kind: "composite", description: "30-day streak AND 50+ lessons completed" }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: "from-stone-500 via-red-700 to-neutral-900", glow: GLOW.high },
  { type: "sharpe_revenge",     name: "Sharpe's Revenge", description: "60-day streak — cold, patient, inevitable", icon: "🥀", unlock: { kind: "streak", days: 60 }, rarity: "epic", tier: "medium_plus", audience: "both", theme: "easter_eggs", gradient: "from-rose-700 via-red-800 to-neutral-900", glow: GLOW.streak },
  { type: "sharpe_honour",      name: "Sharpe's Honour", description: "Profile completed on all fronts — avatar, bio, location, birthday, signature/logo", icon: "🎗️", unlock: { kind: "composite", description: "5+ profile polish flags set" }, rarity: "rare", tier: "medium", audience: "both", theme: "easter_eggs", gradient: "from-emerald-400 via-green-600 to-stone-700", glow: GLOW.med },
  { type: "sharpe_battle",      name: "Sharpe's Battle", description: "500 lessons completed — the rank and file", icon: "🏹", unlock: { kind: "count", counter: "lessons_completed", threshold: 500 }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-stone-500 via-red-700 to-neutral-900", glow: GLOW.crown },
  { type: "sharpe_waterloo",    name: "Sharpe's Waterloo", description: "1000 lessons AND level 25 — you've seen the Napoleonic endgame", icon: "🏛️", unlock: { kind: "composite", description: "1000+ lessons AND level 25+" }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-slate-600 via-zinc-700 to-stone-900", glow: GLOW.crown },
  { type: "harpers_volley_gun", name: "Harper's Volley Gun", description: "Completed 7 lessons in a single day — seven barrels, seven shots", icon: "💥", unlock: { kind: "composite", description: "7+ lessons completed in one calendar day" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-amber-500 via-orange-600 to-red-700", glow: GLOW.high },
  { type: "chosen_men",         name: "Chosen Men", description: "Issued 10 certificates — picked your own elite", icon: "🛡️", unlock: { kind: "count", counter: "certificates_issued", threshold: 10 }, rarity: "legendary", tier: "hard", audience: "teacher", theme: "easter_eggs", gradient: "from-emerald-500 via-green-700 to-slate-800", glow: GLOW.crown },
  { type: "wellingtons_orders", name: "Wellington's Orders", description: "100 lessons AND a 30-day streak — disciplined obedience", icon: "📜", unlock: { kind: "composite", description: "100+ lessons AND 30-day streak" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-red-600 via-rose-700 to-slate-800", glow: GLOW.high },

  // ═══ Weather + platform-days ════════════════════════════════════
  // Weather data comes from the clock-weather-card's Open-Meteo ping
  // (logged to weather_observations). Platform-days are distinct
  // daily_activity dates, no streak required.
  { type: "survivor_42",    name: "I Survived >42°", description: "Lived through a day over 42°C on the platform", icon: "🥵", unlock: { kind: "composite", description: "A weather observation above 42°C" }, rarity: "legendary", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-yellow-400 via-red-500 to-rose-700", glow: GLOW.crown },
  { type: "heatwave_35_3d", name: "Three-Day Heatwave", description: "Three consecutive days at 35°C or above", icon: "☀️", unlock: { kind: "composite", description: "3 consecutive days ≥ 35°C" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-yellow-400 via-orange-500 to-red-600", glow: GLOW.high },
  { type: "rain_scholar",   name: "I Like to Study While It Rains", description: "Studied on 20 distinct rainy days", icon: "🌧️", unlock: { kind: "composite", description: "20 distinct active days with rain observed" }, rarity: "epic", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-slate-400 via-sky-600 to-indigo-700", glow: GLOW.high },
  { type: "meio_besta",     name: "Meio-Besta · Dia 333", description: "333 distinct active days on the platform — half the beast", icon: "😈", unlock: { kind: "composite", description: "333 distinct active days" }, rarity: "legendary", tier: "hard", audience: "both", theme: "easter_eggs", gradient: "from-red-500 via-rose-700 to-stone-900", glow: GLOW.crown },
  { type: "a_besta",        name: "A Besta · 666", description: "666 distinct active days on the platform — the number of the beast", icon: "👹", unlock: { kind: "composite", description: "666 distinct active days" }, rarity: "mythic", tier: "very_hard", audience: "both", theme: "easter_eggs", gradient: "from-red-700 via-neutral-900 to-black", glow: GLOW.crown },
];

/**
 * Maps a certificate level code (a1, a1_1, a2, a, b2, custom, …)
 * to the badge type(s) the student should earn. Full-band codes
 * ("a" / "b" / "c") award both badges in the band; half-semester
 * codes collapse to the parent family (a1_1 → cert_a1). "custom"
 * and unrecognised codes yield no badge.
 */
export function certificateBadgeTypes(level: string): string[] {
  const family = level.toLowerCase().match(/^[a-c][12]/)?.[0];
  if (family) return [`cert_${family}`];
  if (level === "a") return ["cert_a1", "cert_a2"];
  if (level === "b") return ["cert_b1", "cert_b2"];
  if (level === "c") return ["cert_c1", "cert_c2"];
  return [];
}

export const BADGE_BY_TYPE: Record<string, BadgeDefinition> =
  Object.fromEntries(BADGE_DEFINITIONS.map((b) => [b.type, b]));

export function badgesForAudience(audience: "teacher" | "student"): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(
    (b) => b.audience === "both" || b.audience === audience,
  );
}

export const STREAK_CONFIG = {
  RESET_HOUR_UTC: 6,
  MIN_ACTIVITY: 1,
} as const;
