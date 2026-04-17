import { describe, expect, it } from "vitest";
import { getLevel, getXpForNextLevel, computeStreak } from "@/lib/gamification/engine";

describe("getLevel", () => {
  it("starts at level 1", () => {
    expect(getLevel(0)).toBe(1);
  });
  it("increases every 100 XP", () => {
    expect(getLevel(100)).toBe(2);
    expect(getLevel(450)).toBe(5);
  });
  it("caps at MAX_LEVEL", () => {
    expect(getLevel(1_000_000)).toBe(50);
  });
});

describe("getXpForNextLevel", () => {
  it("reports 0/100 at start of a level", () => {
    const r = getXpForNextLevel(0);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(100);
    expect(r.progress).toBe(0);
  });
  it("reports partial progress within a level", () => {
    const r = getXpForNextLevel(250);
    expect(r.current).toBe(50);
    expect(r.progress).toBe(50);
  });
});

describe("computeStreak", () => {
  const iso = (d: Date) => d.toISOString().split("T")[0];

  it("returns 0 when there are no activities", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 86_400_000);
    expect(
      computeStreak([
        { activity_date: iso(today) },
        { activity_date: iso(yesterday) },
        { activity_date: iso(twoDaysAgo) },
      ])
    ).toBe(3);
  });

  it("breaks when there is a gap", () => {
    const today = new Date();
    const threeDaysAgo = new Date(today.getTime() - 3 * 86_400_000);
    expect(
      computeStreak([
        { activity_date: iso(today) },
        { activity_date: iso(threeDaysAgo) },
      ])
    ).toBe(1);
  });

  it("returns 0 when the last activity is older than yesterday", () => {
    const old = new Date(Date.now() - 5 * 86_400_000);
    expect(computeStreak([{ activity_date: old.toISOString().split("T")[0] }])).toBe(0);
  });
});
