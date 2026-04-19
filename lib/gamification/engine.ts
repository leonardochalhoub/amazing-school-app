import { LEVEL_THRESHOLDS } from "./config";

/**
 * Diablo-style exponential curve: each level costs more XP than the
 * previous. Uses the classic RPG formula
 *   xp_to_cross(n→n+1) = 50·n² + 50·n
 * which gives a nice accelerating difficulty ramp.
 *
 *   1→2:    100 XP
 *   2→3:    300 XP
 *   5→6:  1,800 XP
 *  10→11: 5,500 XP
 *  20→21: 22,000 XP
 */
function xpToCross(fromLevel: number): number {
  if (fromLevel < 1) return 0;
  return 50 * fromLevel * fromLevel + 50 * fromLevel;
}

const CUMULATIVE_CACHE: number[] = [0, 0]; // index = level; level 1 starts at 0 XP
function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  for (let i = CUMULATIVE_CACHE.length; i <= level; i++) {
    CUMULATIVE_CACHE[i] = CUMULATIVE_CACHE[i - 1] + xpToCross(i - 1);
  }
  return CUMULATIVE_CACHE[level];
}

export function getLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let lvl = 1;
  while (
    lvl < LEVEL_THRESHOLDS.MAX_LEVEL &&
    totalXp >= cumulativeXpForLevel(lvl + 1)
  ) {
    lvl++;
  }
  return lvl;
}

export function getXpForNextLevel(totalXp: number) {
  const lvl = getLevel(totalXp);
  const base = cumulativeXpForLevel(lvl);
  const next = cumulativeXpForLevel(lvl + 1);
  const span = Math.max(1, next - base);
  const xpInLevel = Math.max(0, totalXp - base);
  const cappedInLevel = Math.min(xpInLevel, span);
  return {
    current: cappedInLevel,
    needed: span,
    progress: (cappedInLevel / span) * 100,
  };
}

/** Total XP required to BE at this level — useful for progress math. */
export function xpRequiredForLevel(level: number): number {
  return cumulativeXpForLevel(level);
}

/** XP delta to cross FROM this level to the next. */
export function xpToNextLevel(level: number): number {
  return xpToCross(level);
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
