export const XP_REWARDS = {
  LESSON_COMPLETE: 25,
  AI_CHAT_5_MESSAGES: 10,
  AI_CHAT_20_MESSAGES: 25,
  STREAK_BONUS_7_DAYS: 50,
  STREAK_BONUS_30_DAYS: 200,
} as const;

export const LEVEL_THRESHOLDS = {
  // Legacy flat value — only referenced by old call sites. New code uses
  // the progressive `getXpForNextLevel` helpers in engine.ts.
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 60,
} as const;

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type BadgeUnlockRule =
  | { kind: "auto" }
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "count"; counter: string; threshold: number };

export interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  unlock: BadgeUnlockRule;
  rarity: BadgeRarity;
  gradient: string;
  glow: string;
}

/**
 * Futuristic badge catalog. Each badge carries its own gradient + glow
 * so the BadgeCard component can render a consistent neon chip.
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "welcome_aboard",
    name: "First Contact",
    description: "Joined Amazing School — welcome!",
    icon: "🚀",
    unlock: { kind: "auto" },
    rarity: "common",
    gradient: "from-sky-400 via-indigo-500 to-violet-600",
    glow: "shadow-[0_0_25px_-5px_rgba(99,102,241,0.7)]",
  },
  {
    type: "first_lesson",
    name: "First Signal",
    description: "Completed your first lesson",
    icon: "🎯",
    unlock: { kind: "count", counter: "lessons_completed", threshold: 1 },
    rarity: "common",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    glow: "shadow-[0_0_25px_-5px_rgba(16,185,129,0.7)]",
  },
  {
    type: "first_chat",
    name: "Neural Handshake",
    description: "Started your first AI conversation",
    icon: "💬",
    unlock: { kind: "count", counter: "conversations", threshold: 1 },
    rarity: "common",
    gradient: "from-fuchsia-400 via-purple-500 to-indigo-600",
    glow: "shadow-[0_0_25px_-5px_rgba(168,85,247,0.7)]",
  },
  {
    type: "five_lessons",
    name: "Momentum",
    description: "Completed 5 lessons",
    icon: "📚",
    unlock: { kind: "count", counter: "lessons_completed", threshold: 5 },
    rarity: "common",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    glow: "shadow-[0_0_25px_-5px_rgba(251,146,60,0.7)]",
  },
  {
    type: "bookworm",
    name: "Bookworm",
    description: "Completed 25 lessons",
    icon: "📖",
    unlock: { kind: "count", counter: "lessons_completed", threshold: 25 },
    rarity: "rare",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
    glow: "shadow-[0_0_25px_-5px_rgba(244,63,94,0.8)]",
  },
  {
    type: "streak_7",
    name: "Ignited",
    description: "7-day streak",
    icon: "🔥",
    unlock: { kind: "streak", days: 7 },
    rarity: "rare",
    gradient: "from-orange-400 via-red-500 to-rose-600",
    glow: "shadow-[0_0_25px_-5px_rgba(239,68,68,0.8)]",
  },
  {
    type: "streak_30",
    name: "Unstoppable",
    description: "30-day streak",
    icon: "⚡",
    unlock: { kind: "streak", days: 30 },
    rarity: "epic",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    glow: "shadow-[0_0_28px_-4px_rgba(245,158,11,0.9)]",
  },
  {
    type: "streak_90",
    name: "Quarter Orbit",
    description: "90-day streak",
    icon: "🌌",
    unlock: { kind: "streak", days: 90 },
    rarity: "legendary",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    glow: "shadow-[0_0_32px_-2px_rgba(168,85,247,1)]",
  },
  {
    type: "music_lover",
    name: "Soundwave",
    description: "Completed 5 music lessons",
    icon: "🎧",
    unlock: { kind: "count", counter: "music_completed", threshold: 5 },
    rarity: "rare",
    gradient: "from-pink-400 via-rose-500 to-red-500",
    glow: "shadow-[0_0_25px_-5px_rgba(236,72,153,0.7)]",
  },
  {
    type: "level_5",
    name: "Rising Signal",
    description: "Reached Level 5",
    icon: "⭐",
    unlock: { kind: "level", level: 5 },
    rarity: "common",
    gradient: "from-cyan-400 via-sky-500 to-indigo-600",
    glow: "shadow-[0_0_25px_-5px_rgba(14,165,233,0.7)]",
  },
  {
    type: "level_10",
    name: "Constellation",
    description: "Reached Level 10",
    icon: "🌟",
    unlock: { kind: "level", level: 10 },
    rarity: "rare",
    gradient: "from-indigo-400 via-violet-500 to-purple-600",
    glow: "shadow-[0_0_28px_-3px_rgba(139,92,246,0.85)]",
  },
  {
    type: "level_25",
    name: "Nova",
    description: "Reached Level 25",
    icon: "🌠",
    unlock: { kind: "level", level: 25 },
    rarity: "epic",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    glow: "shadow-[0_0_30px_-2px_rgba(217,70,239,0.95)]",
  },
  {
    type: "level_50",
    name: "Supernova",
    description: "Reached Level 50",
    icon: "✨",
    unlock: { kind: "level", level: 50 },
    rarity: "mythic",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    glow: "shadow-[0_0_40px_0px_rgba(252,211,77,1)]",
  },
  {
    type: "perfect_lesson",
    name: "Clean Sweep",
    description: "Finished a lesson with zero mistakes",
    icon: "💎",
    unlock: { kind: "count", counter: "perfect_lessons", threshold: 1 },
    rarity: "rare",
    gradient: "from-teal-300 via-emerald-500 to-cyan-600",
    glow: "shadow-[0_0_25px_-3px_rgba(45,212,191,0.8)]",
  },
];

export const BADGE_BY_TYPE: Record<string, BadgeDefinition> =
  Object.fromEntries(BADGE_DEFINITIONS.map((b) => [b.type, b]));

export const STREAK_CONFIG = {
  RESET_HOUR_UTC: 6,
  MIN_ACTIVITY: 1,
} as const;
