import { describe, expect, it } from "vitest";
import {
  getAllLessons,
  getLessonsByCefr,
  getLessonsByCefrAndSkill,
  getCefrIndex,
  findMeta,
  getLesson,
} from "@/lib/content/loader";
import { CEFR_LEVELS } from "@/lib/content/schema";

describe("content loader", () => {
  it("returns the full index", () => {
    const lessons = getAllLessons();
    expect(lessons.length).toBeGreaterThan(0);
    for (const l of lessons) {
      expect(CEFR_LEVELS).toContain(l.cefr_level);
    }
  });

  it("filters lessons by CEFR level", () => {
    const a11 = getLessonsByCefr("a1.1");
    expect(a11.length).toBeGreaterThan(0);
    for (const l of a11) expect(l.cefr_level).toBe("a1.1");
  });

  it("filters by CEFR + skill", () => {
    const a11grammar = getLessonsByCefrAndSkill("a1.1", "grammar");
    for (const l of a11grammar) {
      expect(l.cefr_level).toBe("a1.1");
      expect(l.category).toBe("grammar");
    }
  });

  it("exposes the CEFR index", () => {
    const idx = getCefrIndex();
    expect(Object.keys(idx).sort()).toEqual([...CEFR_LEVELS].sort());
  });

  it("finds meta by slug", () => {
    expect(findMeta("present-simple")?.slug).toBe("present-simple");
    expect(findMeta("does-not-exist")).toBeNull();
  });

  it("loads full lesson content by slug", async () => {
    const lesson = await getLesson("present-simple");
    expect(lesson).not.toBeNull();
    expect(lesson?.exercises.length).toBeGreaterThanOrEqual(3);
    expect(lesson?.cefr_level).toBe("a1.1");
  });
});
