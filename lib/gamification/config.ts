export const XP_REWARDS = {
  LESSON_COMPLETE: 25,
  AI_CHAT_5_MESSAGES: 10,
  AI_CHAT_20_MESSAGES: 25,
  STREAK_BONUS_7_DAYS: 50,
  STREAK_BONUS_30_DAYS: 200,
} as const;

export const LEVEL_THRESHOLDS = {
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 50,
} as const;

export const BADGE_DEFINITIONS = [
  { type: "first_lesson", name: "First Steps", description: "Complete your first lesson", icon: "🎯" },
  { type: "five_lessons", name: "Getting Serious", description: "Complete 5 lessons", icon: "📚" },
  { type: "first_chat", name: "Conversation Starter", description: "Have your first AI conversation", icon: "💬" },
  { type: "streak_7", name: "On Fire", description: "7-day streak", icon: "🔥" },
  { type: "streak_30", name: "Unstoppable", description: "30-day streak", icon: "⚡" },
  { type: "level_5", name: "Rising Star", description: "Reach level 5", icon: "⭐" },
  { type: "level_10", name: "English Explorer", description: "Reach level 10", icon: "🌟" },
  { type: "perfect_lesson", name: "Perfectionist", description: "Complete a lesson with no mistakes", icon: "💎" },
] as const;

export type BadgeDefinition = (typeof BADGE_DEFINITIONS)[number];

export const STREAK_CONFIG = {
  RESET_HOUR_UTC: 6,
  MIN_ACTIVITY: 1,
} as const;
