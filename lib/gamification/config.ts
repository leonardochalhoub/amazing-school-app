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

  // ─── CEFR certificate badges ─────────────────────────────────
  // Awarded automatically when a teacher issues a certificate at
  // the matching CEFR family. Full-band certs ("a", "b", "c")
  // award BOTH badges in the band. Each gradient progresses from
  // cool / ascending (A1) to warm / culminating (C2) so the
  // badge rail on a student's profile reads as a visible journey.
  {
    type: "cert_a1",
    name: "Ignição",
    description: "Certificado CEFR A1 · Iniciante",
    icon: "🚀",
    unlock: { kind: "auto" },
    rarity: "common",
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
    glow: "shadow-[0_0_25px_-5px_rgba(59,130,246,0.8)]",
  },
  {
    type: "cert_a2",
    name: "Órbita",
    description: "Certificado CEFR A2 · Pré-Intermediário",
    icon: "📡",
    unlock: { kind: "auto" },
    rarity: "rare",
    gradient: "from-violet-400 via-purple-500 to-fuchsia-600",
    glow: "shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)]",
  },
  {
    type: "cert_b1",
    name: "Trajetória",
    description: "Certificado CEFR B1 · Intermediário",
    icon: "🛰️",
    unlock: { kind: "auto" },
    rarity: "rare",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    glow: "shadow-[0_0_28px_-4px_rgba(20,184,166,0.9)]",
  },
  {
    type: "cert_b2",
    name: "Navegador",
    description: "Certificado CEFR B2 · Intermediário Superior",
    icon: "🧭",
    unlock: { kind: "auto" },
    rarity: "epic",
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "shadow-[0_0_32px_-3px_rgba(249,115,22,0.95)]",
  },
  {
    type: "cert_c1",
    name: "Maestria",
    description: "Certificado CEFR C1 · Avançado",
    icon: "👑",
    unlock: { kind: "auto" },
    rarity: "epic",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-600",
    glow: "shadow-[0_0_34px_-2px_rgba(236,72,153,1)]",
  },
  {
    type: "cert_c2",
    name: "Proficiência",
    description: "Certificado CEFR C2 · Proficiente",
    icon: "🌌",
    unlock: { kind: "auto" },
    rarity: "mythic",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    glow: "shadow-[0_0_42px_0px_rgba(252,211,77,1)]",
  },
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

export const STREAK_CONFIG = {
  RESET_HOUR_UTC: 6,
  MIN_ACTIVITY: 1,
} as const;
