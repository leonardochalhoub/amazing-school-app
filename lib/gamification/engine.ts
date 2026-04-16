import { LEVEL_THRESHOLDS } from "./config";

export function getLevel(totalXp: number): number {
  return Math.min(
    Math.floor(totalXp / LEVEL_THRESHOLDS.XP_PER_LEVEL) + 1,
    LEVEL_THRESHOLDS.MAX_LEVEL
  );
}

export function getXpForNextLevel(totalXp: number) {
  const xpInCurrentLevel = totalXp % LEVEL_THRESHOLDS.XP_PER_LEVEL;
  return {
    current: xpInCurrentLevel,
    needed: LEVEL_THRESHOLDS.XP_PER_LEVEL,
    progress: (xpInCurrentLevel / LEVEL_THRESHOLDS.XP_PER_LEVEL) * 100,
  };
}

export function computeStreak(
  activities: { activity_date: string }[]
): number {
  if (activities.length === 0) return 0;

  const dates = activities
    .map((a) => a.activity_date)
    .sort()
    .reverse();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
